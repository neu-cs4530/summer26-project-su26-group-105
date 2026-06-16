import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  socketRegisterUserSession,
  socketOpenDirectChat,
  socketOpenChannelById,
  socketCreateGroupChat,
  socketSendChatMessage,
} from "../src/controllers/dms.controller.ts";
import { ChannelRepo, DirectMessageRepo, FriendRepo, UserRepo } from "../src/repository.ts";
import { createUser } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { getOrCreateDirectChannel } from "../src/services/dms.service.ts";
import type { GameServerSocket, GameServer } from "../src/types.ts";

// mock helpers
function makeMockSocket() {
  const socket = {
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    rooms: new Set<string>(),
  };
  return socket as unknown as GameServerSocket & {
    emit: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
  };
}

function makeMockIo() {
  const toChain = { emit: vi.fn() };
  const io = {
    to: vi.fn().mockReturnValue(toChain),
    emit: vi.fn(),
  };
  return { io: io as unknown as GameServer, toChain };
}

let userAId: string;

beforeEach(async () => {
  await UserRepo.clear();
  await FriendRepo.clear();
  await ChannelRepo.clear();
  await DirectMessageRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
});

// socket registiner user tests
describe("socketRegisterUserSession", () => {
  it("joins the user's personal room", async () => {
    const socket = makeMockSocket();
    await socketRegisterUserSession(socket)("alice");
    expect(socket.join).toHaveBeenCalledWith("alice");
  });

  it("emits existing channels to the user", async () => {
    await getOrCreateDirectChannel({ username: "alice", userId: userAId }, "bob");
    const socket = makeMockSocket();
    await socketRegisterUserSession(socket)("alice");
    expect(socket.emit).toHaveBeenCalledWith("globalChatCreated", expect.any(Object));
  });

  it("does nothing for nonexistent user", async () => {
    const socket = makeMockSocket();
    await socketRegisterUserSession(socket)("nobody");
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("does nothing for non-string input", async () => {
    const socket = makeMockSocket();
    await socketRegisterUserSession(socket)(123 as unknown as string);
    expect(socket.join).not.toHaveBeenCalled();
  });
});

// socket opens direct chat tests
describe("socketOpenDirectChat", () => {
  it("creates a DM channel and emits globalChatCreated and globalChatJoined", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketOpenDirectChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: "bob",
    });

    expect(toChain.emit).toHaveBeenCalledWith("globalChatCreated", expect.any(Object));
    expect(toChain.emit).toHaveBeenCalledWith("globalChatJoined", expect.any(Object));
  });

  it("emits globalChatActionError for invalid auth", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketOpenDirectChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: "bob",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "open_dm" }),
    );
  });

  it("emits globalChatActionError for nonexistent recipient", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketOpenDirectChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: "nobody",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "open_dm" }),
    );
  });
});

// socket opens channel tests
describe("socketOpenChannelById", () => {
  it("emits globalChatJoined for a valid channel the user is in", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketOpenChannelById(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: channel!.channelId,
    });

    expect(toChain.emit).toHaveBeenCalledWith("globalChatJoined", expect.any(Object));
  });

  it("emits globalChatActionError for nonexistent channel", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketOpenChannelById(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: "nonexistent-channel",
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "open_channel" }),
    );
  });

  it("emits globalChatActionError when user is not a member", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    await createUser("carol", "pwdC", new Date());
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketOpenChannelById(
      socket,
      io,
    )({
      auth: { username: "carol", password: "pwdC" },
      payload: channel!.channelId,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "open_channel" }),
    );
  });
});

// socket create group chat tests
describe("socketCreateGroupChat", () => {
  it("creates a group and emits globalChatCreated and globalChatJoined", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketCreateGroupChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { groupName: "Test Group", memberIds: ["bob"] },
    });

    expect(toChain.emit).toHaveBeenCalledWith("globalChatCreated", expect.any(Object));
    expect(toChain.emit).toHaveBeenCalledWith("globalChatJoined", expect.any(Object));
  });

  it("emits globalChatActionError for invalid auth", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketCreateGroupChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { groupName: "Test Group", memberIds: ["bob"] },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "create_group" }),
    );
  });

  it("emits globalChatActionError for invalid payload", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketCreateGroupChat(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { invalid: "data" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "create_group" }),
    );
  });
});

// socket send message tests
describe("socketSendChatMessage", () => {
  it("sends a message and emits globalChatMessageReceived to members", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketSendChatMessage(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { channelId: channel!.channelId, content: "Hello!" },
    });

    expect(toChain.emit).toHaveBeenCalledWith(
      "globalChatMessageReceived",
      expect.objectContaining({ content: "Hello!" }),
    );
  });

  it("emits globalChatActionError for invalid auth", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSendChatMessage(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { channelId: "some-channel", content: "Hello!" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "send_message" }),
    );
  });

  it("emits globalChatActionError for nonexistent channel", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSendChatMessage(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { channelId: "nonexistent", content: "Hello!" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "globalChatActionError",
      expect.objectContaining({ action: "send_message" }),
    );
  });
});

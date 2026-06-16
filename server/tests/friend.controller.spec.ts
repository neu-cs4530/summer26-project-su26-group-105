import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  socketList,
  socketRequest,
  socketAccept,
  socketDecline,
  socketRemove,
  socketBlock,
  socketUnblock,
  socketSearch,
  socketSetStatus,
  socketUserConnect,
} from "../src/controllers/friend.controller.ts";
import { FriendRepo, UserRepo } from "../src/repository.ts";
import { createUser } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import {
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
} from "../src/services/friend.service.ts";
import type { GameServerSocket, GameServer } from "../src/types.ts";

// mock helpers
function makeMockSocket() {
  const socket = {
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    userId: undefined as string | undefined,
  };
  return socket as unknown as GameServerSocket & {
    emit: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
    userId: string | undefined;
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

function auth(username: string, password: string) {
  return { auth: { username, password }, payload: {} };
}

let userAId: string;
let userBId: string;

beforeEach(async () => {
  await UserRepo.clear();
  await FriendRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
});

// testing socket list of friends
describe("socketList", () => {
  it("joins the user's personal room and emits friendListUpdated", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketList(socket, io)(auth("alice", "pwdA"));

    expect(socket.join).toHaveBeenCalledWith(`friend-${userAId}`);
    expect(toChain.emit).toHaveBeenCalledWith(
      "friendListUpdated",
      expect.objectContaining({ friends: expect.any(Array) }),
    );
  });

  it("does not emit friendListUpdated on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketList(socket, io)(auth("alice", "wrongpassword"));

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket send and receive friend request
describe("socketRequest", () => {
  it("sends a friend request and pushes updated lists to both users", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRequest(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "bob" },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated for nonexistent target user", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRequest(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "nobody" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRequest(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { username: "bob" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket accept friend request
describe("socketAccept", () => {
  it("accepts a pending request and pushes updated lists", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketAccept(
      socket,
      io,
    )({
      auth: { username: "bob", password: "pwdB" },
      payload: { requestId: friendId },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketAccept(
      socket,
      io,
    )({
      auth: { username: "bob", password: "wrong" },
      payload: { requestId: "some-id" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket decline friend request
describe("socketDecline", () => {
  it("declines a pending request and pushes updated lists", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketDecline(
      socket,
      io,
    )({
      auth: { username: "bob", password: "pwdB" },
      payload: { requestId: friendId },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketDecline(
      socket,
      io,
    )({
      auth: { username: "bob", password: "wrong" },
      payload: { requestId: "some-id" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket remove user as friend
describe("socketRemove", () => {
  it("removes an accepted friendship and pushes updated lists", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRemove(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { requestId: friendId },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated for nonexistent record", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRemove(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { requestId: "nonexistent-id" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket block user
describe("socketBlock", () => {
  it("blocks a user and pushes updated lists to both", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketBlock(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "bob" },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated for nonexistent user", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketBlock(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "nobody" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket unblock user
describe("socketUnblock", () => {
  it("unblocks a user and pushes updated list", async () => {
    await blockUser(userAId, userBId);
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketUnblock(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "bob" },
    });

    expect(toChain.emit).toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });

  it("does not emit friendListUpdated for nonexistent user", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketUnblock(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { username: "nobody" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

// testing socket search for user
describe("socketSearch", () => {
  it("returns search results matching query", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSearch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { query: "bob", type: "all" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "friendSearchResults",
      expect.objectContaining({ results: expect.any(Array) }),
    );
  });

  it("returns empty results for empty query", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSearch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { query: "", type: "all" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "friendSearchResults",
      expect.objectContaining({ results: [] }),
    );
  });

  it("searches existing friends only when type is existing", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSearch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { query: "bob", type: "existing" },
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "friendSearchResults",
      expect.objectContaining({ results: [] }),
    );
  });

  it("does not emit friendSearchResults on bad auth", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSearch(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { query: "bob", type: "all" },
    });

    expect(socket.emit).not.toHaveBeenCalledWith("friendSearchResults", expect.any(Object));
  });
});

// testing socket set activity status
describe("socketSetStatus", () => {
  it("sets status without error for valid status", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketSetStatus(
      socket,
      io,
    )({
      auth: { username: "alice", password: "pwdA" },
      payload: { status: "idle" },
    });

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("does not call io on bad auth", async () => {
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketSetStatus(
      socket,
      io,
    )({
      auth: { username: "alice", password: "wrong" },
      payload: { status: "idle" },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendStatusUpdated", expect.any(Object));
  });
});

// testing socket user connect
describe("socketUserConnect", () => {
  it("joins user room and sets userId on socket", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketUserConnect(socket, io)(auth("alice", "pwdA"));

    expect(socket.join).toHaveBeenCalledWith(`friend-${userAId}`);
    expect(socket.userId).toBe(userAId);
  });

  it("does not join room on bad auth", async () => {
    const socket = makeMockSocket();
    const { io } = makeMockIo();

    await socketUserConnect(socket, io)(auth("alice", "wrong"));

    expect(socket.join).not.toHaveBeenCalledWith(`friend-${userAId}`);
  });
});

// testing socket remove friends when unauthorized
describe("socketRemove — unauthorized", () => {
  it("does not emit friendListUpdated when user tries to remove someone else's friendship", async () => {
    // alice and bob are friends
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    // carol tries to remove alice-bob friendship
    await createUser("carol", "pwdC", new Date());
    const socket = makeMockSocket();
    const { io, toChain } = makeMockIo();

    await socketRemove(
      socket,
      io,
    )({
      auth: { username: "carol", password: "pwdC" },
      payload: { requestId: friendId },
    });

    expect(toChain.emit).not.toHaveBeenCalledWith("friendListUpdated", expect.any(Object));
  });
});

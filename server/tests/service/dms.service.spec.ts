import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyMessagingPermissions,
  getOrCreateDirectChannel,
  createGroupChannel,
  postMessageToChannel,
  getChannelHistory,
  getChannelsForUser,
  filterDeliverableMembers,
} from "../../src/services/dms.service.ts";
import { ChannelRepo, DirectMessageRepo, FriendRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { blockUser } from "../../src/services/friend.service.ts";

let userAId: string;
let userBId: string;

beforeEach(async () => {
  await UserRepo.clear();
  await FriendRepo.clear();
  await ChannelRepo.clear();
  await DirectMessageRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("catherine", "pwdC", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
});

// verify messaging perms tests
describe("verifyMessagingPermissions", () => {
  it("allows messaging between two users with default settings", async () => {
    const result = await verifyMessagingPermissions(userAId, userBId);
    expect(result.allowed).toBe(true);
  });

  it("blocks messaging when user blocks the other", async () => {
    await blockUser(userAId, userBId);
    const result = await verifyMessagingPermissions(userAId, userBId);
    expect(result.allowed).toBe(false);
  });

  it("blocks messaging when other user blocks sender", async () => {
    await blockUser(userBId, userAId);
    const result = await verifyMessagingPermissions(userAId, userBId);
    expect(result.allowed).toBe(false);
  });

  it("blocks messaging to yourself", async () => {
    const result = await verifyMessagingPermissions(userAId, userAId);
    expect(result.allowed).toBe(false);
  });

  it("returns false for nonexistent user", async () => {
    const result = await verifyMessagingPermissions(userAId, "nonexistent-id");
    expect(result.allowed).toBe(false);
  });
});

// get/create direct channel tests
describe("getOrCreateDirectChannel", () => {
  it("creates a new DM channel between two users", async () => {
    const { channel, error } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    expect(error).toBeNull();
    expect(channel).not.toBeNull();
    expect(channel!.memberIds).toContain("alice");
    expect(channel!.memberIds).toContain("bob");
    expect(channel!.isGroup).toBe(false);
  });

  it("returns the same channel if it already exists", async () => {
    const { channel: first } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const { channel: second } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    expect(first!.channelId).toBe(second!.channelId);
  });

  it("returns error for nonexistent recipient", async () => {
    const { channel, error } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "nobody",
    );
    expect(channel).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error when blocked", async () => {
    await blockUser(userAId, userBId);
    const { channel, error } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    expect(channel).toBeNull();
    expect(error).toBeTruthy();
  });
});

// tests creating group chat
describe("createGroupChannel", () => {
  it("creates a group channel with valid members", async () => {
    const { channel, error } = await createGroupChannel(
      { username: "alice", userId: userAId },
      { groupName: "Test Group", memberIds: ["bob", "catherine"] },
    );
    expect(error).toBeUndefined();
    expect(channel).not.toBeNull();
    expect(channel!.isGroup).toBe(true);
    expect(channel!.memberIds).toContain("alice");
    expect(channel!.memberIds).toContain("bob");
    expect(channel!.memberIds).toContain("catherine");
  });

  it("returns error for invalid payload", async () => {
    const { channel, error } = await createGroupChannel(
      { username: "alice", userId: userAId },
      { invalid: "data" },
    );
    expect(channel).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error when trying to add a blocked user", async () => {
    await blockUser(userAId, userBId);
    const { channel, error } = await createGroupChannel(
      { username: "alice", userId: userAId },
      { groupName: "Test Group", memberIds: ["bob"] },
    );
    expect(channel).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error for nonexistent member", async () => {
    const { channel, error } = await createGroupChannel(
      { username: "alice", userId: userAId },
      { groupName: "Test Group", memberIds: ["nobody"] },
    );
    expect(channel).toBeNull();
    expect(error).toBeTruthy();
  });
});

// tests posting messages to chat
describe("postMessageToChannel", () => {
  it("sends a message to a valid channel", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const { message, error } = await postMessageToChannel("alice", {
      channelId: channel!.channelId,
      content: "Hello!",
    });
    expect(error).toBeUndefined();
    expect(message).not.toBeNull();
    expect(message!.content).toBe("Hello!");
    expect(message!.senderId).toBe("alice");
  });

  it("returns error for invalid payload", async () => {
    const { message, error } = await postMessageToChannel("alice", { invalid: "data" });
    expect(message).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error for nonexistent channel", async () => {
    const { message, error } = await postMessageToChannel("alice", {
      channelId: "nonexistent",
      content: "Hello!",
    });
    expect(message).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error when sender is not a member", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const { message, error } = await postMessageToChannel("catherine", {
      channelId: channel!.channelId,
      content: "Intruding!",
    });
    expect(message).toBeNull();
    expect(error).toBeTruthy();
  });
});

// tests getting channel history
describe("getChannelHistory", () => {
  it("returns message history for a channel member", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    await postMessageToChannel("alice", { channelId: channel!.channelId, content: "Hi" });
    await postMessageToChannel("bob", { channelId: channel!.channelId, content: "Hey" });

    const { messages, error } = await getChannelHistory("alice", channel!.channelId);
    expect(error).toBeUndefined();
    expect(messages).toHaveLength(2);
  });

  it("returns error for nonexistent channel", async () => {
    const { messages, error } = await getChannelHistory("alice", "nonexistent");
    expect(messages).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error when user is not a member", async () => {
    const { channel } = await getOrCreateDirectChannel(
      { username: "alice", userId: userAId },
      "bob",
    );
    const { messages, error } = await getChannelHistory("catherine", channel!.channelId);
    expect(messages).toBeNull();
    expect(error).toBeTruthy();
  });
});

// gets users channels tests
describe("getChannelsForUser", () => {
  it("returns empty array when user has no channels", async () => {
    const channels = await getChannelsForUser("alice");
    expect(channels).toHaveLength(0);
  });

  it("returns channels the user is a member of", async () => {
    await getOrCreateDirectChannel({ username: "alice", userId: userAId }, "bob");
    const channels = await getChannelsForUser("alice");
    expect(channels).toHaveLength(1);
  });

  it("does not return channels the user is not a member of", async () => {
    await getOrCreateDirectChannel({ username: "bob", userId: userBId }, "catherine");
    const channels = await getChannelsForUser("alice");
    expect(channels).toHaveLength(0);
  });
});

// filters members for blocks tests
describe("filterDeliverableMembers", () => {
  it("returns all members when no blocks exist", async () => {
    const result = await filterDeliverableMembers("alice", ["alice", "bob", "catherine"]);
    expect(result).toContain("alice");
    expect(result).toContain("bob");
    expect(result).toContain("catherine");
  });

  it("excludes blocked members", async () => {
    await blockUser(userAId, userBId);
    const result = await filterDeliverableMembers("alice", ["alice", "bob", "catherine"]);
    expect(result).toContain("alice");
    expect(result).not.toContain("bob");
    expect(result).toContain("catherine");
  });
});

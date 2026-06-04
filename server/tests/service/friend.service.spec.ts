import { describe, expect, it, beforeEach } from "vitest";
import { FriendRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  getBlockedUsers,
  searchUsers,
} from "../../src/services/friend.service.ts";

// user ids for tests
let userAId: string;
let userBId: string;
let userCId: string;

beforeEach(async () => {
  await FriendRepo.clear();
  await UserRepo.clear();

  const { getUserByUsername } = await import("../../src/services/auth.service.ts");

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());
  await createUser("catherine", "pwdC", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
  userCId = (await getUserByUsername("catherine"))!.userId;
});

// sendFriendRequest tests
describe("sendFriendRequest", () => {
  it("creates a pending request between two valid users", async () => {
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("friendId");

    const incoming = await getIncomingRequests(userBId);
    expect(incoming).toHaveLength(1);
    expect(incoming[0].userId).toBe(userAId);
    expect(incoming[0].username).toBe("alice");
  });

  it("does not allow a request to yourself", async () => {
    const result = await sendFriendRequest(userAId, userAId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow a request to a non-existent user", async () => {
    const result = await sendFriendRequest(userAId, "fake-user-id");
    expect(result).toHaveProperty("error");
  });

  it("does not allow a duplicate request from the same sender", async () => {
    await sendFriendRequest(userAId, userBId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow a request when users are already friends", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("error");
  });

  it("auto-accepts when the other user already sent a request to the sender", async () => {
    await sendFriendRequest(userBId, userAId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("friendId");

    const friends = await getFriends(userAId);
    expect(friends.some((f) => f.userId === userBId)).toBe(true);
  });

  it("does not allow a request to a user who has blocked you", async () => {
    await blockUser(userBId, userAId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("error");
  });
});

// acceptFriendRequest
describe("acceptFriendRequest", () => {
  it("accepts a valid pending request", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const result = await acceptFriendRequest(friendId, userBId);
    expect(result).toStrictEqual({ success: true });

    const friends = await getFriends(userBId);
    expect(friends.some((f) => f.userId === userAId)).toBe(true);
  });

  it("does not allow acceptance by the sender", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const result = await acceptFriendRequest(friendId, userAId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow accepting of a non-existent request", async () => {
    const result = await acceptFriendRequest("fake-request-id", userBId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow acceptance of a non-pending request", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);
    const result = await acceptFriendRequest(friendId, userBId);
    expect(result).toHaveProperty("error");
  });
});

// declineFriendRequest

describe("declineFriendRequest", () => {
  it("declines a valid pending request", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const result = await declineFriendRequest(friendId, userBId);
    expect(result).toStrictEqual({ success: true });

    const incoming = await getIncomingRequests(userBId);
    expect(incoming).toHaveLength(0);
  });

  it("does not allow declining by the sender", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    const result = await declineFriendRequest(friendId, userAId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow decline of a non-existent request", async () => {
    const result = await declineFriendRequest("fake-request-id", userBId);
    expect(result).toHaveProperty("error");
  });

  it("does not allow decline of a non-pending request", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);
    const result = await declineFriendRequest(friendId, userBId);
    expect(result).toHaveProperty("error");
  });

  it("allows sender to re-request after being declined", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await declineFriendRequest(friendId, userBId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("friendId");
  });
});

// removeFriend
describe("removeFriend", () => {
  it("removes an accepted friend", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const result = await removeFriend(userAId, userBId);
    expect(result).toStrictEqual({ success: true });

    const friends = await getFriends(userAId);
    expect(friends).toHaveLength(0);
  });

  it("either user in the relationship can remove the other", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const result = await removeFriend(userBId, userAId);
    expect(result).toStrictEqual({ success: true });
  });

  it("fails when not friends", async () => {
    const result = await removeFriend(userAId, userBId);
    expect(result).toHaveProperty("error");
  });

  it("allows re-friending after removal", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);
    await removeFriend(userAId, userBId);

    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("friendId");
  });
});

// blockUser
describe("blockUser", () => {
  it("blocks a user with no prior relationship", async () => {
    const result = await blockUser(userAId, userBId);
    expect(result).toStrictEqual({ success: true });

    const blocked = await getBlockedUsers(userAId);
    expect(blocked.some((b) => b.userId === userBId)).toBe(true);
  });

  it("does not allow blocking yourself", async () => {
    const result = await blockUser(userAId, userAId);
    expect(result).toHaveProperty("error");
  });

  it("converts an accepted friendship into a block", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    await blockUser(userAId, userBId);

    const friends = await getFriends(userAId);
    expect(friends.some((f) => f.userId === userBId)).toBe(false);

    const blocked = await getBlockedUsers(userAId);
    expect(blocked.some((b) => b.userId === userBId)).toBe(true);
  });

  it("converts a pending request into a block", async () => {
    await sendFriendRequest(userBId, userAId);
    await blockUser(userAId, userBId);

    const incoming = await getIncomingRequests(userAId);
    expect(incoming).toHaveLength(0);

    const blocked = await getBlockedUsers(userAId);
    expect(blocked.some((b) => b.userId === userBId)).toBe(true);
  });

  it("blocked user does not appear in blocker's friends list", async () => {
    await blockUser(userAId, userBId);
    const friends = await getFriends(userAId);
    expect(friends.some((f) => f.userId === userBId)).toBe(false);
  });

  it("blocked user does not appear in search results for blocker", async () => {
    await blockUser(userAId, userBId);
    const results = await searchUsers(userAId, "bob");
    expect(results.some((r) => r.userId === userBId)).toBe(false);
  });

  it("blocker does not appear in search results for blocked user", async () => {
    await blockUser(userAId, userBId);
    const results = await searchUsers(userBId, "alice");
    expect(results.some((r) => r.userId === userAId)).toBe(false);
  });
});

// unblockUser
describe("unblockUser", () => {
  it("unblocks a previously blocked user", async () => {
    await blockUser(userAId, userBId);
    const result = await unblockUser(userAId, userBId);
    expect(result).toStrictEqual({ success: true });

    const blocked = await getBlockedUsers(userAId);
    expect(blocked.some((b) => b.userId === userBId)).toBe(false);
  });

  it("fails when there is no block to remove", async () => {
    const result = await unblockUser(userAId, userBId);
    expect(result).toHaveProperty("error");
  });

  it("fails if trying to unblock as the wrong user", async () => {
    await blockUser(userAId, userBId);
    const result = await unblockUser(userBId, userAId);
    expect(result).toHaveProperty("error");
  });

  it("allows sending a friend request after unblocking", async () => {
    await blockUser(userAId, userBId);
    await unblockUser(userAId, userBId);
    const result = await sendFriendRequest(userAId, userBId);
    expect(result).toHaveProperty("friendId");
  });
});

// query helpers
describe("getFriends, getIncomingRequests,ngetOutgoingRequests", () => {
  it("correctly separates all three states", async () => {
    // userA -> userB pending request
    await sendFriendRequest(userAId, userBId);
    // userC -> userA accepted request
    const { friendId } = (await sendFriendRequest(userCId, userAId)) as { friendId: string };
    await acceptFriendRequest(friendId, userAId);

    const friends = await getFriends(userAId);
    expect(friends).toHaveLength(1);
    expect(friends[0].userId).toBe(userCId);

    const outgoing = await getOutgoingRequests(userAId);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].userId).toBe(userBId);

    const incoming = await getIncomingRequests(userAId);
    expect(incoming).toHaveLength(0);
  });

  it("returns empty arrays when no relationships exist", async () => {
    expect(await getFriends(userAId)).toHaveLength(0);
    expect(await getIncomingRequests(userAId)).toHaveLength(0);
    expect(await getOutgoingRequests(userAId)).toHaveLength(0);
  });

  it("friend appears in both users' friend lists after acceptance", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const aFriends = await getFriends(userAId);
    const bFriends = await getFriends(userBId);

    expect(aFriends.some((f) => f.userId === userBId)).toBe(true);
    expect(bFriends.some((f) => f.userId === userAId)).toBe(true);
  });
});

// searchUsers
describe("searchUsers", () => {
  it("returns users matching a username query", async () => {
    const results = await searchUsers(userAId, "bob");
    expect(results.some((r) => r.username === "bob")).toBe(true);
  });

  it("does not return the searching user", async () => {
    const results = await searchUsers(userAId, "alice");
    expect(results.some((r) => r.userId === userAId)).toBe(false);
  });

  it("returns empty array for empty query", async () => {
    const results = await searchUsers(userAId, "");
    expect(results).toHaveLength(0);
  });

  it("returns empty array for no matches", async () => {
    const results = await searchUsers(userAId, "zzznomatch");
    expect(results).toHaveLength(0);
  });

  it("annotates results with correct relationship status", async () => {
    // userA -> userB pending -- outgoing for userA
    await sendFriendRequest(userAId, userBId);
    // userC -> userA pending -- incoming for A
    await sendFriendRequest(userCId, userAId);

    const results = await searchUsers(userAId, "b");
    const bobResult = results.find((r) => r.userId === userBId);
    expect(bobResult?.relationship).toBe("outgoing");

    const catherineResult = (await searchUsers(userAId, "catherine")).find(
      (r) => r.userId === userCId,
    );
    expect(catherineResult?.relationship).toBe("incoming");
  });

  it("annotates accepted friends correctly", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const results = await searchUsers(userAId, "bob");
    const bobResult = results.find((r) => r.userId === userBId);
    expect(bobResult?.relationship).toBe("friend");
  });
});

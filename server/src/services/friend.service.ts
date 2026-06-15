import { randomUUID } from "node:crypto";
import { FriendRepo, UserRepo } from "../repository.ts";
import type { FriendsRecord, RecordId } from "../models.ts";
import { getStatus } from "./activityStatus.service.ts";
import type { FriendEntry, SearchResult } from "@gamenite/shared/src/friend.types.ts";
import { recordToSafeUserInfo } from "./user.service.ts";

/** Returns all id, FriendsRecord pairs in the data store */
async function getAllFriendRecords(): Promise<[string, FriendsRecord][]> {
  const keys = await FriendRepo.getAllKeys();
  if (keys.length === 0) return [];
  const values = await FriendRepo.getMany(keys);
  return keys.map((key, i) => [key, values[i]]);
}

/** Finds the record for a specific pair of from -> to user relationship */
async function findRecord(
  fromUserId: RecordId,
  toUserId: RecordId,
): Promise<{ id: string; record: FriendsRecord } | null> {
  const all = await getAllFriendRecords();
  for (const [id, record] of all) {
    if (record.fromUserId === fromUserId && record.toUserId === toUserId) {
      return { id, record };
    }
  }
  return null;
}

/** Finds any record in either direction (from -> to, to -> from) between two users */
async function findAnyRecord(
  userA: RecordId,
  userB: RecordId,
): Promise<{ id: string; record: FriendsRecord } | null> {
  return (await findRecord(userA, userB)) ?? (await findRecord(userB, userA));
}

/** Sends a friend request from one user (fromUserId) to another (toUserId) */
export async function sendFriendRequest(
  fromUserId: RecordId,
  toUserId: RecordId,
): Promise<{ error: string } | { friendId: string }> {
  if (fromUserId === toUserId) {
    return { error: "Cannot send a friend request to yourself" };
  }

  const requestedUser = await UserRepo.find(toUserId);
  if (!requestedUser) return { error: "User is not found." };

  const existingFriend = await findAnyRecord(fromUserId, toUserId);
  if (existingFriend) {
    const { record } = existingFriend;
    if (record.status === "accepted") {
      return { error: "You are already friends with this user." };
    }
    if (record.status === "blocked") {
      return { error: "Unable to send friend request." };
    }
    if (record.status === "pending") {
      // if other user already sent a request, auto accept it by requesting back
      if (record.fromUserId === toUserId && record.toUserId === fromUserId) {
        await FriendRepo.set(existingFriend.id, {
          ...record,
          status: "accepted",
          updatedAt: new Date().toISOString(),
        });
        return { friendId: existingFriend.id };
      }
      return { error: "A friend request is already pending." };
    }
  }

  const friendId = randomUUID();
  const now = new Date().toISOString();
  await FriendRepo.set(friendId, {
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return { friendId };
}

/** Accepts a pending friend request */
export async function acceptFriendRequest(
  requestId: RecordId,
  currentUserId: RecordId,
): Promise<{ error: string } | { success: true }> {
  const record = await FriendRepo.find(requestId);
  if (!record) return { error: "Friend request was not found." };

  if (record.toUserId !== currentUserId) {
    return { error: "Only the recipient can accept a friend request." };
  }

  if (record.status !== "pending") {
    return { error: "This friend request is no longer pending." };
  }

  await FriendRepo.set(requestId, {
    ...record,
    status: "accepted",
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

/**
 * Declines a pending friend request
 * Record is deleted upon decline
 */
export async function declineFriendRequest(
  requestId: RecordId,
  currentUserId: RecordId,
): Promise<{ error: string } | { success: true }> {
  const record = await FriendRepo.find(requestId);
  if (!record) return { error: "Friend request was not found." };

  if (record.toUserId !== currentUserId) {
    return { error: "Only the recipient can decline a friend request." };
  }

  if (record.status !== "pending") {
    return { error: "This friend request is no longer pending." };
  }

  await FriendRepo.set(requestId, {
    ...record,
    status: "removed",
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

/** Removes an existing friend */
export async function removeFriend(
  currentUserId: RecordId,
  otherUserId: RecordId,
): Promise<{ error: string } | { success: true }> {
  const existingFriend = await findAnyRecord(currentUserId, otherUserId);
  if (!existingFriend || existingFriend.record.status !== "accepted") {
    return { error: "You are not friends with this user." };
  }

  await FriendRepo.set(existingFriend.id, {
    ...existingFriend.record,
    status: "removed",
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

/** Blocks a user, can replace any previously existing relationship. */
export async function blockUser(
  currentUserId: RecordId,
  chosenUserId: RecordId,
): Promise<{ error: string } | { success: true }> {
  if (currentUserId === chosenUserId) {
    return { error: "You cannot block yourself." };
  }

  const existingUser = await findAnyRecord(currentUserId, chosenUserId);
  const now = new Date().toISOString();

  const id = existingUser?.id ?? randomUUID();
  await FriendRepo.set(id, {
    fromUserId: currentUserId,
    toUserId: chosenUserId,
    status: "blocked",
    createdAt: now,
    updatedAt: now,
  });
  return { success: true };
}

/** Unblocks previously blocked user. */
export async function unblockUser(
  currentUserId: RecordId,
  chosenUserId: RecordId,
): Promise<{ error: string } | { success: true }> {
  const existingUser = await findRecord(currentUserId, chosenUserId);
  if (!existingUser || existingUser.record.status !== "blocked") {
    return { error: "Cannot unblock, user is not blocked." };
  }
  // removes block, but does not send friend request
  await FriendRepo.set(existingUser.id, {
    ...existingUser.record,
    status: "removed",
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

/** Gets all accepted friends for a user with their profile info */
export async function getFriends(userId: RecordId): Promise<FriendEntry[]> {
  const all = await getAllFriendRecords();
  const results: FriendEntry[] = [];

  for (const [id, record] of all) {
    if (record.status !== "accepted") continue;
    const isFrom = record.fromUserId === userId;
    const isTo = record.toUserId === userId;
    if (!isFrom && !isTo) continue;

    const otherUserId = isFrom ? record.toUserId : record.fromUserId;
    const otherUser = await UserRepo.find(otherUserId);

    if (!otherUser) continue;

    results.push({
      friendId: id,
      userId: otherUserId,
      user: recordToSafeUserInfo(otherUser),
      requestDirection: "mutual",
      activityStatus: getStatus(otherUserId),
    });
  }
  return results;
}

/** Gets all pending incoming friend requests for a user. */
export async function getIncomingRequests(userId: RecordId): Promise<FriendEntry[]> {
  const all = await getAllFriendRecords();
  const results: FriendEntry[] = [];

  for (const [id, record] of all) {
    if (record.status !== "pending" || record.toUserId !== userId) continue;
    const sender = await UserRepo.find(record.fromUserId);
    if (!sender) continue;

    results.push({
      friendId: id,
      userId: record.fromUserId,
      user: recordToSafeUserInfo(sender),
      requestDirection: "incoming",
      activityStatus: getStatus(record.fromUserId),
    });
  }
  return results;
}

/** Gets all pending outgoing friend requests for a user. */
export async function getOutgoingRequests(userId: RecordId): Promise<FriendEntry[]> {
  const all = await getAllFriendRecords();
  const results: FriendEntry[] = [];

  for (const [id, record] of all) {
    if (record.status !== "pending" || record.fromUserId !== userId) continue;
    const requested = await UserRepo.find(record.toUserId);
    if (!requested) continue;

    results.push({
      friendId: id,
      userId: record.toUserId,
      user: recordToSafeUserInfo(requested),
      requestDirection: "outgoing",
      activityStatus: getStatus(record.toUserId),
    });
  }
  return results;
}

/** Gets all users blocked by the current user. */
export async function getBlockedUsers(userId: RecordId): Promise<FriendEntry[]> {
  const all = await getAllFriendRecords();
  const results: FriendEntry[] = [];

  for (const [id, record] of all) {
    if (record.status !== "blocked" || record.fromUserId !== userId) continue;
    const blocked = await UserRepo.find(record.toUserId);
    if (!blocked) continue;

    results.push({
      friendId: id,
      userId: record.toUserId,
      user: recordToSafeUserInfo(blocked),
      requestDirection: "outgoing",
      activityStatus: getStatus(record.toUserId),
    });
  }
  return results;
}

async function searchFriends(
  currentUserId: RecordId,
  query: string,
): Promise<SearchResult<true>[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const friends = await getFriends(currentUserId);
  return friends
    .filter(
      (u) => u.user.username.toLowerCase().includes(q) || u.user.display.toLowerCase().includes(q),
    )
    .map((u) => ({
      userId: u.userId,
      user: u.user,
      relationship: "friend",
      friendId: u.friendId,
    }));
}

export async function searchUsers(
  currentUserId: RecordId,
  query: string,
  type: "existing" | "all",
): Promise<SearchResult<boolean>[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  if (type === "existing") return await searchFriends(currentUserId, query);

  const [friends, incoming, outgoing, blocked] = await Promise.all([
    getFriends(currentUserId),
    getIncomingRequests(currentUserId),
    getOutgoingRequests(currentUserId),
    getBlockedUsers(currentUserId),
  ]);

  const friendUserIds = new Set(friends.map((f) => f.userId));
  const incomingUserIds = new Set(incoming.map((f) => f.userId));
  const outgoingUserIds = new Set(outgoing.map((f) => f.userId));
  const blockedUserIds = new Set(blocked.map((f) => f.userId));

  const userKeys = await UserRepo.getAllKeys();
  const users = await UserRepo.getMany(userKeys);

  const results: SearchResult[] = [];
  for (let i = 0; i < userKeys.length; i++) {
    const id = userKeys[i];
    const u = users[i];
    if (id === currentUserId) continue;
    if (blockedUserIds.has(id)) continue;

    const theyBlockedYou = await findRecord(id, currentUserId);
    if (theyBlockedYou && theyBlockedYou.record.status === "blocked") continue;

    if (!u.username.toLowerCase().includes(q) && !u.display.toLowerCase().includes(q)) continue;

    let relationship: SearchResult["relationship"] = "none";
    if (friendUserIds.has(id)) relationship = "friend";
    else if (incomingUserIds.has(id)) relationship = "incoming";
    else if (outgoingUserIds.has(id)) relationship = "outgoing";

    results.push({
      userId: id,
      user: recordToSafeUserInfo(u),
      relationship,
      friendId: undefined,
    });
  }
  return results;
}

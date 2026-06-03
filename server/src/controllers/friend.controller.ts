import { withAuth } from "@gamenite/shared";
import { z } from "zod";
import { enforceAuth, getUserByUsername } from "../services/auth.service.ts";
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  getBlockedUsers,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  unblockUser,
} from "../services/friend.service.ts";
import { FriendRepo } from "../repository.ts";
import { type SocketAPI, type GameServer } from "../types.ts";
import { logSocketError } from "./socket.controller.ts";

/** Personal room for a user to push real-time friend updates to them. */
function userRoom(userId: string) {
  return `friend-${userId}`;
}

/**
 * Fetches the full friend state for a user to output the updated
 * friend list to their personal userRoom
 */
async function pushFriendList(io: GameServer, userId: string) {
  const [friends, incoming, outgoing, blocked] = await Promise.all([
    getFriends(userId),
    getIncomingRequests(userId),
    getOutgoingRequests(userId),
    getBlockedUsers(userId),
  ]);
  io.to(userRoom(userId)).emit("friendListUpdated", { friends, incoming, outgoing, blocked });
}

/**
 * Handles `friendList` which joins the user's personal room and outputs
 * their current up-to-date friend state.
 */
export const socketList: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth } = withAuth(z.object({})).parse(body);
    const user = await enforceAuth(auth);
    await socket.join(userRoom(user.userId));
    await pushFriendList(io, user.userId);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendRequest`, which sends a friend request to the chosen user
 * and pushes updates to both sender and receiver.
 */
export const socketRequest: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { username },
    } = withAuth(z.object({ username: z.string() })).parse(body);
    const user = await enforceAuth(auth);

    const requested = await getUserByUsername(username);
    if (!requested) throw new Error(`User not found: ${username}`);

    const result = await sendFriendRequest(user.userId, requested.userId);
    if ("error" in result) throw new Error(result.error);

    await Promise.all([pushFriendList(io, user.userId), pushFriendList(io, requested.userId)]);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendAccept`, when a pending friend request is accepted and updates
 * friend lists of both users involved.
 */
export const socketAccept: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { requestId },
    } = withAuth(z.object({ requestId: z.string() })).parse(body);
    const user = await enforceAuth(auth);

    const record = await FriendRepo.find(requestId);

    const result = await acceptFriendRequest(requestId, user.userId);
    if ("error" in result) throw new Error(result.error);

    await pushFriendList(io, user.userId);
    if (record) await pushFriendList(io, record.fromUserId);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendDecline`, declining a pending friend request and pushes updated friend
 * lists/pending lists to both users involved.
 */
export const socketDecline: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { requestId },
    } = withAuth(z.object({ requestId: z.string() })).parse(body);
    const user = await enforceAuth(auth);

    const record = await FriendRepo.find(requestId);

    const result = await declineFriendRequest(requestId, user.userId);
    if ("error" in result) throw new Error(result.error);

    await pushFriendList(io, user.userId);
    if (record) await pushFriendList(io, record.fromUserId);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendRemove`, which removes and existing friend and pushes updated friend
 * list to both users involved.
 */
export const socketRemove: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { username },
    } = withAuth(z.object({ username: z.string() })).parse(body);
    const user = await enforceAuth(auth);
    const other = await getUserByUsername(username);
    if (!other) throw new Error(`User not found: ${username}`);

    const result = await removeFriend(user.userId, other.userId);
    if ("error" in result) throw new Error(result.error);

    await Promise.all([pushFriendList(io, user.userId), pushFriendList(io, other.userId)]);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendBlock`, blocking a user and pushes the updated friend/users
 * list to both users so all friend lists in relationship are updated.
 */
export const socketBlock: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { username },
    } = withAuth(z.object({ username: z.string() })).parse(body);
    const user = await enforceAuth(auth);
    const other = await getUserByUsername(username);
    if (!other) throw new Error(`User not found: ${username}`);

    const result = await blockUser(user.userId, other.userId);
    if ("error" in result) throw new Error(result.error);

    await Promise.all([pushFriendList(io, user.userId), pushFriendList(io, other.userId)]);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendUnblock`, unblocking a previously blocked user and pushes
 * updated friend/user list to unblocker only.
 */
export const socketUnblock: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { username },
    } = withAuth(z.object({ username: z.string() })).parse(body);
    const user = await enforceAuth(auth);
    const other = await getUserByUsername(username);
    if (!other) throw new Error(`User not found: ${username}`);

    const result = await unblockUser(user.userId, other.userId);
    if ("error" in result) throw new Error(result.error);

    await pushFriendList(io, user.userId);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `friendSearch` which searches through all users by username or display name,
 * filtered by searching user's relationships with other users (blocked or not).
 */
export const socketSearch: SocketAPI = (socket) => async (body) => {
  try {
    const {
      auth,
      payload: { query },
    } = withAuth(z.object({ query: z.string() })).parse(body);
    const user = await enforceAuth(auth);
    const results = await searchUsers(user.userId, query);
    socket.emit("friendSearchResults", { results });
  } catch (err) {
    logSocketError(socket, err);
  }
};

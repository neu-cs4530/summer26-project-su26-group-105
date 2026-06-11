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
  searchUsers,
  sendFriendRequest,
  unblockUser,
} from "../services/friend.service.ts";
import { setStatus } from "../services/activityStatus.service.ts";
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
    // store userId on socket for disconnect cleanup
    socket.userId = user.userId;
    await setStatus(io, user.userId, "online");
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

    //finds an incoming request so notification can show sender information
    const incomingRequest = (await getIncomingRequests(requested.userId)).find(
      (request) => request.friendId === result.friendId,
    );

    //if there is one, send popup notification to requested user
    if (incomingRequest) {
      io.to(userRoom(requested.userId)).emit("notificationPopup", {
        type: "friendRequestReceived",
        message: `${incomingRequest.display} sent you a friend request.`,
      });
    }

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

    //notify the user who sent it
    if (record) {
      //finds the accepted friendship from sender's friend list
      const acceptedRequest = (await getFriends(record.fromUserId)).find(
        (friend) => friend.friendId === requestId,
      );

      //send a popup notification to original sender if accept request was fuond
      if (acceptedRequest) {
        io.to(userRoom(record.fromUserId)).emit("notificationPopup", {
          type: "friendRequestAccepted",
          message: `${acceptedRequest.display} accepted your friend request.`,
        });
      }
    }

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
    //parses socket request and gets id of friendship being removed
    const {
      auth,
      payload: { requestId },
    } = withAuth(z.object({ requestId: z.string() })).parse(body);
    const user = await enforceAuth(auth);

    //finds friendship record that should be removed
    const record = await FriendRepo.find(requestId);
    if (!record) throw new Error(`Friend record not found: ${requestId}`);

    //prevents users from removing friendships that dont exist
    if (record.fromUserId !== user.userId && record.toUserId !== user.userId) {
      throw new Error("You cannot remove a friendship you are not part of.");
    }

    const otherUserId = record.fromUserId === user.userId ? record.toUserId : record.fromUserId;

    //marks friendship as removed instead of completely deleting it
    await FriendRepo.set(requestId, {
      ...record,
      status: "removed",
      updatedAt: new Date().toISOString(),
    });

    await Promise.all([pushFriendList(io, user.userId), pushFriendList(io, otherUserId)]);
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
      payload: { query, type },
    } = withAuth(
      z.object({ query: z.string(), type: z.union([z.literal("existing"), z.literal("all")]) }),
    ).parse(body);
    const user = await enforceAuth(auth);
    const results = await searchUsers(user.userId, query, type);
    socket.emit("friendSearchResults", { results });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `setStatus` which allows a user to manually set their activity status.
 * Pushes the update to all online friends, not everyone.
 */
export const socketSetStatus: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { status },
    } = withAuth(z.object({ status: z.enum(["online", "idle", "dnd", "offline"]) })).parse(body);
    const user = await enforceAuth(auth);
    await setStatus(io, user.userId, status);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handles `userConnect`, which is fired immediately when a user logs in on any page.
 * Joins their personal friend room and sets them online globally.
 * This ensures status is tracked even if the user never visits the friends page,
 * and that the disconnect handler can always find their userId.
 */
export const socketUserConnect: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth } = withAuth(z.object({})).parse(body);
    const user = await enforceAuth(auth);
    // store userId on socket so disconnect handler can clear status
    socket.userId = user.userId;
    await socket.join(`friend-${user.userId}`);
    await setStatus(io, user.userId, "online");
  } catch (err) {
    logSocketError(socket, err);
  }
};

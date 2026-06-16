import { type GameServerSocket, type SocketAPI, type UserWithId } from "../types.ts";
import {
  getOrCreateDirectChannel,
  createGroupChannel,
  postMessageToChannel,
  getChannelHistory,
  getChannelsForUser,
  filterDeliverableMembers,
} from "../services/dms.service.ts";
import { checkAuth, getUserByUsername } from "../services/auth.service.ts";
import { withAuth } from "@gamenite/shared";
import { z } from "zod";
import { ChannelRepo } from "../repository.ts";

/**
 * Validates an incoming socket
 * @returns the authenticated user and validated payload, or null if the
 *   request was rejected (an error has already been emitted in that case)
 * (is this needed?)
 */
async function authenticate<T>(
  socket: GameServerSocket,
  action: string,
  body: unknown,
  zPayload: z.ZodType<T>,
): Promise<{ user: UserWithId; payload: T } | null> {
  const parsed = withAuth(zPayload).safeParse(body);
  if (!parsed.success) {
    socket.emit("globalChatActionError", { action, error: "Invalid request" });
    return null;
  }

  const user = await checkAuth(parsed.data.auth);
  if (!user) {
    socket.emit("globalChatActionError", { action, error: "You must be logged in to do that" });
    return null;
  }

  return { user, payload: parsed.data.payload };
}

/**
 * Registers a user's socket for real-time messaging
 *
 * The client sends its username. DM broadcasts target io.to(username) (channel
 * membership is keyed by username), so we join that room
 */
export const socketRegisterUserSession = (socket: GameServerSocket) => async (username: string) => {
  if (typeof username !== "string") return;
  const user = await getUserByUsername(username);
  if (!user) return;

  await socket.join(user.username);

  const channels = await getChannelsForUser(user.username);
  for (const channel of channels) {
    socket.emit("globalChatCreated", channel);
  }
};

/**
 * start or open a 1-on-1 direct message conversation
 * The payload is the recipient's username
 */
export const socketOpenDirectChat: SocketAPI = (socket, io) => async (body) => {
  const ctx = await authenticate(socket, "open_dm", body, z.string());
  if (!ctx) return;
  const { user, payload: recipientUsername } = ctx;

  const { channel, error } = await getOrCreateDirectChannel(user, recipientUsername);

  if (error || !channel) {
    socket.emit("globalChatActionError", {
      action: "open_dm",
      error: error || "Failed to open conversation",
    });
    return;
  }

  // Make sure the conversation shows up in every member's sidebar
  for (const memberId of channel.memberIds) {
    io.to(memberId).emit("globalChatCreated", channel);
  }

  // Switch the requesting user into the channel with its history
  const { messages } = await getChannelHistory(user.username, channel.channelId);
  io.to(user.username).emit("globalChatJoined", {
    channelId: channel.channelId,
    messages: messages || [],
  });
};

/**
 * open an already-existing channel by its id,
 * basically when a user clicks a conversation in their sidebar
 */
export const socketOpenChannelById: SocketAPI = (socket, io) => async (body) => {
  const ctx = await authenticate(socket, "open_channel", body, z.string());
  if (!ctx) return;
  const { user, payload: channelId } = ctx;

  const channel = await ChannelRepo.find(channelId);
  if (!channel || !channel.memberIds.includes(user.username)) {
    socket.emit("globalChatActionError", {
      action: "open_channel",
      error: "Conversation not found or you don't have access to it",
    });
    return;
  }

  const { messages } = await getChannelHistory(user.username, channelId);
  io.to(user.username).emit("globalChatJoined", {
    channelId,
    messages: messages || [],
  });
};

/**
 * Creates a new groupchat between multiple users
 * Sends the channel to all involved members
 *
 */
export const socketCreateGroupChat: SocketAPI = (socket, io) => async (body) => {
  const ctx = await authenticate(
    socket,
    "create_group",
    body,
    z.object({ groupName: z.string(), memberIds: z.array(z.string()) }),
  );
  if (!ctx) return;
  const { user, payload } = ctx;

  const { channel, error } = await createGroupChannel(user, payload);

  if (error || !channel) {
    socket.emit("globalChatActionError", {
      action: "create_group",
      error: error || "Failed to create group",
    });
    return;
  }

  // Broadcast to every member so the new chat appears
  for (const memberId of channel.memberIds) {
    io.to(memberId).emit("globalChatCreated", channel);
  }

  io.to(user.username).emit("globalChatJoined", {
    channelId: channel.channelId,
    messages: [],
  });
};

/**
 * Sends a chat message between users
 * Will not deliver if users have blocked each other
 * checks if privacy perms allow for message delivery
 */
export const socketSendChatMessage: SocketAPI = (socket, io) => async (body) => {
  const ctx = await authenticate(
    socket,
    "send_message",
    body,
    z.object({ channelId: z.string(), content: z.string() }),
  );
  if (!ctx) return;
  const { user, payload } = ctx;

  const { message, error } = await postMessageToChannel(user.username, payload);

  if (error || !message) {
    socket.emit("globalChatActionError", {
      action: "send_message",
      error: error || "Message failed to send",
    });
    return;
  }

  const channel = await ChannelRepo.find(payload.channelId);
  if (!channel) return;

  // Don't deliver between users who have blocked each other, even in a shared group
  const recipients = await filterDeliverableMembers(user.username, channel.memberIds);
  for (const memberId of recipients) {
    io.to(memberId).emit("globalChatMessageReceived", message);
  }
};

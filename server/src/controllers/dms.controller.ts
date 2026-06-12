import { type GameServerSocket, type SocketAPI } from "../types.ts";
import {
  getOrCreateDirectChannel,
  createGroupChannel,
  postMessageToChannel,
  getChannelHistory,
} from "../services/dms.service.ts";
import { enforceAuth } from "../services/auth.service.ts";
import { withAuth } from "@gamenite/shared";
import { z } from "zod";
import { ChannelRepo } from "../repository.ts";
/**
 * Socket listener wrapper to register a user to  real-time notification node
 */
export const socketRegisterUserSession = (socket: GameServerSocket) => async (userId: string) => {
  await socket.join(userId);
};

/**
 * Real-time endpoint to initialize or open a 1-on-1 direct message conversation
 */
export const socketOpenDirectChat: SocketAPI = (socket, io) => async (body) => {
  const { auth, payload: recipientId } = withAuth(z.string()).parse(body);
  const user = await enforceAuth(auth);

  const { channel, error } = await getOrCreateDirectChannel(user.userId, { recipientId });

  if (error || !channel) {
    socket.emit("globalChatActionError", {
      action: "open_dm",
      error: error || "Failed to open conversation",
    });
    return;
  }

  const { messages } = await getChannelHistory(user.userId, channel.channelId);

  // Send the channel data and logs exclusively to the requesting user
  io.to(user.userId).emit("globalChatJoined", {
    channelId: channel.channelId,
    messages: messages || [],
  });
};

/**
 * Real-time endpoint to establish a multi-participant group conversation room
 */
export const socketCreateGroupChat: SocketAPI = (socket, io) => async (body) => {
  const zPayload = z.object({
    groupName: z.string(),
    memberIds: z.array(z.string()),
  });

  const { auth, payload } = withAuth(zPayload).parse(body);
  const user = await enforceAuth(auth);

  const { channel, error } = await createGroupChannel(user.userId, payload);

  if (error || !channel) {
    socket.emit("globalChatActionError", {
      action: "create_group",
      error: error || "Failed to create group",
    });
    return;
  }

  // Broadcast out to every single member added that their new room dashboard is ready
  for (const memberId of channel.memberIds) {
    io.to(memberId).emit("globalChatCreated", channel);
  }
};

/**
 * Real-time endpoint to transmit and broadcast text messages inside a channel room
 */
export const socketSendChatMessage: SocketAPI = (socket, io) => async (body) => {
  const zPayload = z.object({
    channelId: z.string(),
    content: z.string(),
  });

  const { auth, payload } = withAuth(zPayload).parse(body);
  const user = await enforceAuth(auth);

  const { message, error } = await postMessageToChannel(user.userId, payload);

  if (error || !message) {
    socket.emit("globalChatActionError", {
      action: "send_message",
      error: error || "Message failed to send",
    });
    return;
  }

  const channel = await ChannelRepo.get(payload.channelId);

  if (!channel) return;

  // push the text payload directly into everyone's active session room
  for (const memberId of channel.memberIds) {
    io.to(memberId).emit("globalChatMessageReceived", message);
  }
};

import { z } from "zod";

// Privacy Settings validation rules
export const zMessagePrivacySetting = z.enum(["anyone", "friends_only", "no_one"]);
export type MessagePrivacySetting = z.infer<typeof zMessagePrivacySetting>;

// Core Channel payload rules
export const zMessageChannel = z.object({
  channelId: z.string(),
  isGroup: z.boolean(),
  name: z.string().nullable(),
  memberIds: z.array(z.string()),
  createdAt: z.coerce.date(), // Automatically converts string timestamps to Date objects safely
});
export type MessageChannel = z.infer<typeof zMessageChannel>;

// Individual Chat Message verification
export const zChatMessage = z.object({
  messageId: z.string(),
  channelId: z.string(),
  senderId: z.string(),
  content: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  timestamp: z.coerce.date(),
});
export type ChatMessage = z.infer<typeof zChatMessage>;

// For creating a brand new direct message chain
export const zCreateDMPayload = z.object({
  recipientId: z.string(),
});
export type CreateDMPayload = z.infer<typeof zCreateDMPayload>;

// For creating a group message room
export const zCreateGroupPayload = z.object({
  groupName: z.string().min(1).max(50),
  memberIds: z.array(z.string()).min(1, "Group chats need at least one other participant"),
});
export type CreateGroupPayload = z.infer<typeof zCreateGroupPayload>;

// For transmitting a standard conversation text block
export const zSendMessagePayload = z.object({
  channelId: z.string(),
  content: z.string().min(1).trim(),
});
export type SendMessagePayload = z.infer<typeof zSendMessagePayload>;

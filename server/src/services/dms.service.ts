import { ChannelRepo, DirectMessageRepo, UserRepo, FriendRepo } from "../repository.ts";
import {
  zCreateDMPayload,
  zCreateGroupPayload,
  zSendMessagePayload,
  type MessagePrivacySetting,
  type MessageChannel,
  type ChatMessage,
} from "../../../shared/src/dms.types.ts";

/**
 * Helper to generate a consistent channel ID for 1-on-1 conversations
 * @param userAId
 * @param userBId
 * @returns
 */
function getDeterministicDMId(userAId: string, userBId: string): string {
  const sortedIds = [userAId, userBId].sort();
  return `dm:${sortedIds[0]}:${sortedIds[1]}`;
}

/**
 * Evaluates whether a sender is allowed to message a specific recipient
 * @param senderId
 * @param recipientId
 * @returns
 */
export async function verifyMessagingPermissions(
  senderId: string,
  recipientId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (senderId === recipientId) {
    return { allowed: false, reason: "You cannot start a direct message thread with yourself" };
  }
  const recipient = await UserRepo.get(recipientId);
  if (!recipient) {
    return { allowed: false, reason: "Target user profile does not exist" };
  }
  const typedRecipient = recipient as {
    privacySettings?: { allowMessagesFrom?: unknown };
  };

  const rawSetting = typedRecipient.privacySettings?.allowMessagesFrom;
  const rule: MessagePrivacySetting =
    rawSetting === "friends_only" || rawSetting === "no_one" ? rawSetting : "anyone";

  if (rule === "no_one") {
    return { allowed: false, reason: "This user has disabled direct messaging entirely" };
  }

  if (rule === "friends_only") {
    const record = (await FriendRepo.get(recipientId)) as {
      friends?: { userId: string }[];
    } | null;
    const friendList = record?.friends || [];

    const isFriend = friendList.some((f) => f.userId === senderId);
    if (!isFriend) {
      return { allowed: false, reason: "This user only accepts direct messages from friends" };
    }
  }
  return { allowed: true };
}

/**
 * Retrieves an existing 1-on-1 direct channel or constructs a brand new one
 * @param senderId
 * @param rawPayload
 * @returns
 */
export async function getOrCreateDirectChannel(
  senderId: string,
  rawPayload: unknown,
): Promise<{ channel: MessageChannel | null; error?: string }> {
  const parsed = zCreateDMPayload.safeParse(rawPayload);
  if (!parsed.success) {
    return { channel: null, error: "Invalid direct message payload arguments" };
  }

  const { recipientId } = parsed.data;

  const check = await verifyMessagingPermissions(senderId, recipientId);
  if (!check.allowed) {
    return { channel: null, error: check.reason };
  }

  const dmChannelId = getDeterministicDMId(senderId, recipientId);
  const existing = await ChannelRepo.get(dmChannelId);
  if (existing) {
    return { channel: existing };
  }

  const newChannel: MessageChannel = {
    channelId: dmChannelId,
    isGroup: false,
    name: null,
    memberIds: [senderId, recipientId],
    createdAt: new Date(),
  };

  await ChannelRepo.set(dmChannelId, newChannel);
  return { channel: newChannel };
}

/**
 * Provisions a brand new group chat channel conversation block
 * @param creatorId
 * @param rawPayload
 * @returns
 */
export async function createGroupChannel(
  creatorId: string,
  rawPayload: unknown,
): Promise<{ channel: MessageChannel | null; error?: string }> {
  const parsed = zCreateGroupPayload.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      channel: null,
      error: `${parsed.error.issues[0]?.message || "Invalid group payload"}`,
    };
  }

  const { groupName, memberIds } = parsed.data;
  const distinctMembers = Array.from(new Set([creatorId, ...memberIds]));

  const randomGroupId = `group:${Math.random().toString(36).substring(2, 10)}`;
  const newGroup: MessageChannel = {
    channelId: randomGroupId,
    isGroup: true,
    name: groupName,
    memberIds: distinctMembers,
    createdAt: new Date(),
  };

  await ChannelRepo.set(randomGroupId, newGroup);
  return { channel: newGroup };
}

/**
 * Dispatches a verified message text block to an active channel node
 * @param senderId
 * @param rawPayload
 * @returns
 */
export async function postMessageToChannel(
  senderId: string,
  rawPayload: unknown,
): Promise<{ message: ChatMessage | null; error?: string }> {
  const parsed = zSendMessagePayload.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      message: null,
      error: `${parsed.error.issues[0]?.message || "Invalid message payload"}`,
    };
  }

  const { channelId, content } = parsed.data;
  const channel = await ChannelRepo.get(channelId);

  if (!channel) {
    return { message: null, error: "Channel conversation node not found" };
  }

  if (!channel.memberIds.includes(senderId)) {
    return { message: null, error: "You are not an authorized member of this chat channel" };
  }

  const messageId = `msg:${Math.random().toString(36).substring(2, 10)}`;
  const newMessage: ChatMessage = {
    messageId,
    channelId,
    senderId,
    content,
    timestamp: new Date(),
  };
  await DirectMessageRepo.set(messageId, newMessage);
  return { message: newMessage };
}

/**
 * Lists historical message entries bound to a specific chat room context
 */
export async function getChannelHistory(
  userId: string,
  channelId: string,
): Promise<{ messages: ChatMessage[] | null; error?: string }> {
  const channel = await ChannelRepo.get(channelId);

  if (!channel) {
    return { messages: null, error: "Channel not found" };
  }

  if (!channel.memberIds.includes(userId)) {
    return { messages: null, error: "Access denied to message history logs" };
  }

  // Note: For a strict global index listing via Keyv, you would typically pull entries
  // tied to a message index list or append history logs sequentially.
  // For now, this is ready to tie into your index/history aggregator.
  return { messages: [] };
}

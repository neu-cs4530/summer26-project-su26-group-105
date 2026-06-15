import { ChannelRepo, DirectMessageRepo, UserRepo } from "../repository.ts";
import { getUserByUsername } from "./auth.service.ts";
import { areUsersFriends, isBlockedBetween } from "./friend.service.ts";
import {
  zCreateGroupPayload,
  zSendMessagePayload,
  type MessagePrivacySetting,
  type MessageChannel,
  type ChatMessage,
} from "../../../shared/src/dms.types.ts";

/**
 * Everything the client sees and sends is keyed by username
 *  channel memberIds, message `senderId`,
 * and the socket rooms users are placed in are all usernames
 * userIds are used only where needed for the other thingies
 * privacy/friends checks, since UserRepo and FriendRepo are keyed by userId :/
 */

/**
 * Evaluates whether a sender is allowed to message a specific recipient using profile data
 */
export async function verifyMessagingPermissions(
  senderUserId: string,
  recipientUserId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (senderUserId === recipientUserId) {
    return { allowed: false, reason: "You cannot start a direct message thread with yourself" };
  }

  const senderProfile = await UserRepo.find(senderUserId);
  const recipientProfile = await UserRepo.find(recipientUserId);

  if (!senderProfile || !recipientProfile) {
    return { allowed: false, reason: "Target user profile does not exist" };
  }

  // A block in either direction blocks messaging both ways
  if (await isBlockedBetween(senderUserId, recipientUserId)) {
    return { allowed: false, reason: "You cannot message this user" };
  }

  // The privacy preference lives on their settings (defaults to anyone)
  const rawSetting = (recipientProfile as { settings?: { allowMessagesFrom?: unknown } }).settings
    ?.allowMessagesFrom;
  const rule: MessagePrivacySetting =
    rawSetting === "friends_only" || rawSetting === "no_one" ? rawSetting : "anyone";

  if (rule === "no_one") {
    return { allowed: false, reason: "This user has disabled direct messaging entirely" };
  }

  if (rule === "friends_only") {
    const friends = await areUsersFriends(senderUserId, recipientUserId);
    if (!friends) {
      return { allowed: false, reason: "This user only accepts direct messages from friends" };
    }
  }

  return { allowed: true };
}

/**
 * Retrieves an existing 1-on-1 direct message channel,
 * or creates a new one if permissions allow and it doesn't exist yet.
 *
 * @param sender - the authenticated sender (we need both their username for channel
 *   membership and their userId for the permission check)
 * @param recipientUsername - the username the client typed in
 */
export async function getOrCreateDirectChannel(
  sender: { username: string; userId: string },
  recipientUsername: string,
): Promise<{ channel: MessageChannel | null; error: string | null }> {
  // turns recipient's username to a real profile so we can run permission
  // checks (which need userIds) and confirm the user actually exists yay
  const recipient = await getUserByUsername(recipientUsername);
  if (!recipient) {
    return { channel: null, error: "Target user profile does not exist" };
  }

  const permission = await verifyMessagingPermissions(sender.userId, recipient.userId);
  if (!permission.allowed) {
    return {
      channel: null,
      error: permission.reason || "Messaging blocked by privacy settings.",
    };
  }

  // make sure it doesnt matter which order the messaging is done in
  // the identifier for the channel will be the same
  const sortedMembers = [sender.username, recipient.username].sort();
  const uniqueChannelId = `dm:${sortedMembers[0]}:${sortedMembers[1]}`;

  const existingChannel = await ChannelRepo.find(uniqueChannelId);
  if (existingChannel) {
    return { channel: existingChannel, error: null };
  }

  const now = new Date();
  const newChannel: MessageChannel = {
    channelId: uniqueChannelId,
    name: `${sortedMembers[0]} & ${sortedMembers[1]}`,
    isGroup: false,
    memberIds: sortedMembers,
    createdAt: now,
    lastActivityAt: now,
  };

  try {
    await ChannelRepo.set(uniqueChannelId, newChannel);
    return { channel: newChannel, error: null };
  } catch (error) {
    return {
      channel: null,
      error: "Failed to initialize conversation channel database record.",
    };
  }
}

/**
 * brand new group chat channel
 *
 * @param creatorUsername - the authenticated creator's username
 * @param rawPayload - `{ groupName, memberIds }` where memberIds are usernames
 */
export async function createGroupChannel(
  creatorUsername: string,
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

  // Validate every requested member actually exists before creating the room.
  for (const username of memberIds) {
    const member = await getUserByUsername(username);
    if (!member) {
      return { channel: null, error: `User "${username}" does not exist` };
    }
  }

  const distinctMembers = Array.from(new Set([creatorUsername, ...memberIds]));
  if (distinctMembers.length < 2) {
    return { channel: null, error: "Group chats need at least one other participant" };
  }

  const randomGroupId = `group:${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date();
  const newGroup: MessageChannel = {
    channelId: randomGroupId,
    isGroup: true,
    name: groupName,
    memberIds: distinctMembers,
    createdAt: now,
    lastActivityAt: now,
  };

  await ChannelRepo.set(randomGroupId, newGroup);
  return { channel: newGroup };
}

/**
 * send a message text to a channel
 *
 * @param senderUsername - the authenticated sender's username
 */
export async function postMessageToChannel(
  senderUsername: string,
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
  const channel = await ChannelRepo.find(channelId);

  if (!channel) {
    return { message: null, error: "Channel conversation node not found" };
  }

  if (!channel.memberIds.includes(senderUsername)) {
    return { message: null, error: "You are not an authorized member of this chat channel" };
  }

  // For 1-on-1 DMs, re-check messaging permissions on every send (not just on
  // channel creation)
  //  enforces the following:
  // a block in either direction,
  // the recipient switching to "no_one", or "friends_only"
  // if settings dont allow messaging, convos are blocked
  if (!channel.isGroup) {
    const otherUsername = channel.memberIds.find((id) => id !== senderUsername);
    if (otherUsername) {
      const sender = await getUserByUsername(senderUsername);
      const other = await getUserByUsername(otherUsername);
      if (sender && other) {
        const permission = await verifyMessagingPermissions(sender.userId, other.userId);
        if (!permission.allowed) {
          return { message: null, error: permission.reason || "You cannot message this user" };
        }
      }
    }
  }

  const messageId = `msg:${Math.random().toString(36).substring(2, 10)}`;
  const newMessage: ChatMessage = {
    messageId,
    channelId,
    senderId: senderUsername,
    content,
    timestamp: new Date(),
  };
  await DirectMessageRepo.set(messageId, newMessage);

  // record last Activity so conversations can be ordered by most recent message
  channel.lastActivityAt = newMessage.timestamp;
  await ChannelRepo.set(channelId, channel);

  return { message: newMessage };
}

/**
 * Lists historical message entries bound to a specific channel, oldest first.
 *
 * DirectMessageRepo has no per-channel index, so we scan all messages and
 * filter by channelId....this is probably not the best way to do it
 */
export async function getChannelHistory(
  username: string,
  channelId: string,
): Promise<{ messages: ChatMessage[] | null; error?: string }> {
  const channel = await ChannelRepo.find(channelId);

  if (!channel) {
    return { messages: null, error: "Channel not found" };
  }

  if (!channel.memberIds.includes(username)) {
    return { messages: null, error: "Access denied to message history logs" };
  }

  const keys = await DirectMessageRepo.getAllKeys();
  const all = keys.length === 0 ? [] : await DirectMessageRepo.getMany(keys);
  const messages = all
    .filter((m) => m.channelId === channelId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { messages };
}

/**
 * Returns every channel a given user is a member of
 */
export async function getChannelsForUser(username: string): Promise<MessageChannel[]> {
  const keys = await ChannelRepo.getAllKeys();
  if (keys.length === 0) return [];
  const all = await ChannelRepo.getMany(keys);
  return all
    .filter((c) => c.memberIds.includes(username))
    .sort((a, b) => channelActivityTime(b) - channelActivityTime(a));
}

/** Most-recent-activity timestamp for a channel, falling back to its creation time. */
function channelActivityTime(channel: MessageChannel): number {
  return new Date(channel.lastActivityAt ?? channel.createdAt).getTime();
}

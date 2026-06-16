import { describe, it, expect, beforeEach } from "vitest";
import { createChat, forceChatById, addMessageToChat } from "../../src/services/chat.service.ts";
import { createMessage } from "../../src/services/message.service.ts";
import { ChatRepo, MessageRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import type { UserWithId } from "../../src/types.ts";

let userA: UserWithId;

beforeEach(async () => {
  await ChatRepo.clear();
  await MessageRepo.clear();
  await UserRepo.clear();

  await createUser("alice", "pwdA", new Date());
  const auth = await getUserByUsername("alice");
  userA = { userId: auth!.userId, username: "alice" };
});

// creates a chat
describe("createChat", () => {
  it("creates a chat with no messages", async () => {
    const now = new Date();
    const chat = await createChat(now);

    expect(chat.chatId).toBeDefined();
    expect(chat.messages).toHaveLength(0);
    expect(chat.createdAt).toEqual(now);
  });

  it("creates multiple chats independently", async () => {
    const chat1 = await createChat(new Date());
    const chat2 = await createChat(new Date());
    expect(chat1.chatId).not.toBe(chat2.chatId);
  });
});

// tests for chat IDs
describe("forceChatById", () => {
  it("returns chat info for a valid chat id", async () => {
    const created = await createChat(new Date());
    const found = await forceChatById(created.chatId, userA);
    expect(found.chatId).toBe(created.chatId);
    expect(found.messages).toHaveLength(0);
  });

  it("throws for an invalid chat id", async () => {
    await expect(forceChatById("nonexistent-id", userA)).rejects.toThrow(
      "accessed invalid chat id",
    );
  });

  it("includes messages that were added to the chat", async () => {
    const chat = await createChat(new Date());
    const msg = await createMessage(userA, "hello", new Date());
    await addMessageToChat(chat.chatId, userA, msg.messageId);

    const found = await forceChatById(chat.chatId, userA);
    expect(found.messages).toHaveLength(1);
    expect(found.messages[0].text).toBe("hello");
  });
});

// tests adding messages to chat
describe("addMessageToChat", () => {
  it("adds a message to a chat", async () => {
    const chat = await createChat(new Date());
    const msg = await createMessage(userA, "test message", new Date());

    const updated = await addMessageToChat(chat.chatId, userA, msg.messageId);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].text).toBe("test message");
    expect(updated.messages[0].createdBy.username).toBe("alice");
  });

  it("adds multiple messages in order", async () => {
    const chat = await createChat(new Date());
    const msg1 = await createMessage(userA, "first", new Date());
    const msg2 = await createMessage(userA, "second", new Date());
    const msg3 = await createMessage(userA, "third", new Date());

    await addMessageToChat(chat.chatId, userA, msg1.messageId);
    await addMessageToChat(chat.chatId, userA, msg2.messageId);
    const updated = await addMessageToChat(chat.chatId, userA, msg3.messageId);

    expect(updated.messages).toHaveLength(3);
    expect(updated.messages[0].text).toBe("first");
    expect(updated.messages[1].text).toBe("second");
    expect(updated.messages[2].text).toBe("third");
  });

  it("throws for an invalid chat id", async () => {
    const msg = await createMessage(userA, "hello", new Date());
    await expect(addMessageToChat("invalid-id", userA, msg.messageId)).rejects.toThrow(
      "sent to invalid chat id",
    );
  });
});

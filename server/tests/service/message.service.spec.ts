import { describe, it, expect, beforeEach } from "vitest";
import { createMessage, getMessagesById } from "../../src/services/message.service.ts";
import { MessageRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import type { UserWithId } from "../../src/types.ts";

let userA: UserWithId;

beforeEach(async () => {
  await MessageRepo.clear();
  await UserRepo.clear();

  await createUser("alice", "pwdA", new Date());
  const auth = await getUserByUsername("alice");
  userA = { userId: auth!.userId, username: "alice" };
});

// creates a message
describe("createMessage", () => {
  it("creates a message and returns MessageInfo", async () => {
    const now = new Date();
    const msg = await createMessage(userA, "hello world", now);

    expect(msg.messageId).toBeDefined();
    expect(msg.text).toBe("hello world");
    expect(msg.createdAt).toEqual(now);
    expect(msg.createdBy.username).toBe("alice");
  });

  it("stores the message so it can be retrieved later", async () => {
    const msg = await createMessage(userA, "test message", new Date());
    const [retrieved] = await getMessagesById([msg.messageId]);
    expect(retrieved.messageId).toBe(msg.messageId);
    expect(retrieved.text).toBe("test message");
  });

  it("creates multiple messages independently", async () => {
    const msg1 = await createMessage(userA, "first", new Date());
    const msg2 = await createMessage(userA, "second", new Date());
    expect(msg1.messageId).not.toBe(msg2.messageId);
    expect(msg1.text).toBe("first");
    expect(msg2.text).toBe("second");
  });

  it("preserves the exact createdAt timestamp", async () => {
    const timestamp = new Date("2025-03-15T10:30:00Z");
    const msg = await createMessage(userA, "timestamped", timestamp);
    expect(msg.createdAt).toEqual(timestamp);
  });
});

// gets messages by ID
describe("getMessagesById", () => {
  it("returns empty array for empty ids list", async () => {
    const result = await getMessagesById([]);
    expect(result).toHaveLength(0);
  });

  it("returns a single message by id", async () => {
    const msg = await createMessage(userA, "hello", new Date());
    const result = await getMessagesById([msg.messageId]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("hello");
    expect(result[0].createdBy.username).toBe("alice");
  });

  it("returns multiple messages in order", async () => {
    const msg1 = await createMessage(userA, "one", new Date());
    const msg2 = await createMessage(userA, "two", new Date());
    const msg3 = await createMessage(userA, "three", new Date());

    const result = await getMessagesById([msg1.messageId, msg2.messageId, msg3.messageId]);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("one");
    expect(result[1].text).toBe("two");
    expect(result[2].text).toBe("three");
  });

  it("throws for an invalid message id", async () => {
    await expect(getMessagesById(["nonexistent-id"])).rejects.toThrow();
  });
});

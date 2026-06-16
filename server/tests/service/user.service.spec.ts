import { describe, it, expect, beforeEach } from "vitest";
import {
  createUser,
  populateSafeUserInfo,
  populateRecentlyPlayedGames,
  getUsersByUsername,
  updateUser,
} from "../../src/services/user.service.ts";
import { GameRepo, UserRepo } from "../../src/repository.ts";
import { enforceAuth, getUserByUsername } from "../../src/services/auth.service.ts";

beforeEach(async () => {
  await UserRepo.clear();
  await GameRepo.clear();
});

// enforceAuth isn't tested by current integration tests,
// because existing tests exercise the REST api, and enforceAuth
// is only used in the socket api
describe("enforceAuth", () => {
  it("should return a user and id on good auth", async () => {
    const user = await enforceAuth({ username: "user1", password: "pwd1111" });
    expect(user).toStrictEqual({ userId: expect.any(String), username: "user1" });
  });

  it("should raise on bad auth", async () => {
    await expect(enforceAuth({ username: "user1", password: "no" })).rejects.toThrow();
  });
});

// updateUser can't be fully tested by current integration tests; part of its
// contract is that it throws if updateUser is called with an invalid user id,
// but a well-behaved controller won't ever invoke updateUser with an invalid
// user id
describe("updateUser", () => {
  it("should throw if given an invalid user id", async () => {
    await expect(updateUser("fake", { display: "Stacey Fakename" })).rejects.toThrow();
  });
});

// tests creating user
describe("createUser", () => {
  it("returns error for duplicate username", async () => {
    await createUser("alice", "pwdA", new Date());
    const result = await createUser("alice", "pwdB", new Date());
    expect(result).toHaveProperty("error", "User already exists");
  });

  it("returns error for disallowed username 'login'", async () => {
    const result = await createUser("login", "pwd", new Date());
    expect(result).toHaveProperty("error", "That is not a permitted username");
  });

  it("returns error for disallowed username 'signup'", async () => {
    const result = await createUser("signup", "pwd", new Date());
    expect(result).toHaveProperty("error", "That is not a permitted username");
  });

  it("returns error for disallowed username 'list'", async () => {
    const result = await createUser("list", "pwd", new Date());
    expect(result).toHaveProperty("error", "That is not a permitted username");
  });
});

// tests populating bot users
describe("populateSafeUserInfo — bot users", () => {
  it("returns a virtual bot profile without hitting the database", async () => {
    const bot = await populateSafeUserInfo("bot_TestBotName:TestBotName");
    expect(bot.isBot).toBe(true);
    expect(bot.display).toContain("TestBot");
    expect(bot.image).toBeNull();
    expect(bot.socialMedias).toHaveLength(0);
  });

  it("returns different decorations for different bot ids", async () => {
    const bot1 = await populateSafeUserInfo("bot_Alice:Alice");
    const bot2 = await populateSafeUserInfo("bot_Bob:Bob");
    expect(bot1.username).toBe("bot_Alice:Alice");
    expect(bot2.username).toBe("bot_Bob:Bob");
  });

  it("returns consistent decorations for the same bot id", async () => {
    const bot1 = await populateSafeUserInfo("bot_TestBotName:TestBotName");
    const bot2 = await populateSafeUserInfo("bot_TestBotName:TestBotName");
    expect(bot1.decorations).toEqual(bot2.decorations);
  });
});

// tests recently played games for user
describe("populateRecentlyPlayedGames", () => {
  it("returns empty array when user has no games", async () => {
    await createUser("alice", "pwdA", new Date());
    const auth = await getUserByUsername("alice");
    const result = await populateRecentlyPlayedGames(auth!.userId);
    expect(result).toHaveLength(0);
  });

  it("returns only games the user played that have ended", async () => {
    await createUser("alice", "pwdA", new Date());
    await createUser("bob", "pwdB", new Date());
    const authA = await getUserByUsername("alice");
    const authB = await getUserByUsername("bob");

    // game alice played and finished
    await GameRepo.add({
      type: "nim",
      done: true,
      chat: "chat1",
      createdAt: new Date().toISOString(),
      createdBy: authA!.userId,
      players: [authA!.userId, authB!.userId],
      state: {},
      endedAt: new Date().toISOString(),
    });

    // game alice played but is not finished
    await GameRepo.add({
      type: "guess",
      done: false,
      chat: "chat2",
      createdAt: new Date().toISOString(),
      createdBy: authA!.userId,
      players: [authA!.userId],
      state: {},
    });

    // game alice did not play at all
    await GameRepo.add({
      type: "nim",
      done: true,
      chat: "chat3",
      createdAt: new Date().toISOString(),
      createdBy: authB!.userId,
      players: [authB!.userId],
      state: {},
      endedAt: new Date().toISOString(),
    });

    const result = await populateRecentlyPlayedGames(authA!.userId);
    expect(result).toHaveLength(1);
    expect(result[0].gameType).toBe("nim");
  });

  it("returns at most 3 recent games sorted by most recent", async () => {
    await createUser("alice", "pwdA", new Date());
    const auth = await getUserByUsername("alice");
    const userId = auth!.userId;

    const dates = [
      new Date("2025-01-01"),
      new Date("2025-03-01"),
      new Date("2025-05-01"),
      new Date("2025-06-01"),
    ];

    for (const date of dates) {
      await GameRepo.add({
        type: "nim",
        done: true,
        chat: "chat1",
        createdAt: date.toISOString(),
        createdBy: userId,
        players: [userId],
        state: {},
        endedAt: date.toISOString(),
      });
    }

    const result = await populateRecentlyPlayedGames(userId);
    expect(result).toHaveLength(3);

    expect(result[0].datePlayed.getTime()).toBeGreaterThan(result[1].datePlayed.getTime());
    expect(result[1].datePlayed.getTime()).toBeGreaterThan(result[2].datePlayed.getTime());
  });
});

// tests getting users by username
describe("getUsersByUsername", () => {
  it("returns users for valid usernames", async () => {
    await createUser("alice", "pwdA", new Date());
    await createUser("bob", "pwdB", new Date());

    const result = await getUsersByUsername(["alice", "bob"]);
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.username)).toContain("alice");
    expect(result.map((u) => u.username)).toContain("bob");
  });

  it("returns empty array for empty input", async () => {
    const result = await getUsersByUsername([]);
    expect(result).toHaveLength(0);
  });

  it("throws for a nonexistent username", async () => {
    await expect(getUsersByUsername(["nonexistent"])).rejects.toThrow("No user nonexistent");
  });
});

// tests updating user
describe("updateUser", () => {
  beforeEach(async () => {
    await createUser("alice", "pwdA", new Date());
  });

  it("throws for a nonexistent user", async () => {
    await expect(updateUser("nobody", { display: "New Name" })).rejects.toThrow("No user nobody");
  });

  it("updates display name", async () => {
    const result = await updateUser("alice", { display: "Alice Wonderland" });
    expect(result.display).toBe("Alice Wonderland");
  });

  it("updates bio", async () => {
    const result = await updateUser("alice", { bio: "New bio text" });
    expect(result.bio).toBe("New bio text");
  });

  it("updates image", async () => {
    const result = await updateUser("alice", { image: "https://example.com/pic.jpg" });
    expect(result.image).toBe("https://example.com/pic.jpg");
  });

  it("updates socialMedias", async () => {
    const result = await updateUser("alice", {
      socialMedias: [{ username: "alice_tw", link: "https://twitter.com/alice" }],
    });
    expect(result.socialMedias).toHaveLength(1);
    expect(result.socialMedias[0].username).toBe("alice_tw");
  });

  it("updates individual notification settings", async () => {
    const result = await updateUser("alice", {
      settings: {
        receivesFriendRequestNotifications: false,
        receivesFriendAcceptedNotifications: false,
        receivesGameInviteNotifications: false,
        receivesFriendGameActivityNotifications: false,
      },
    });
    expect(result.settings.receivesFriendRequestNotifications).toBe(false);
    expect(result.settings.receivesFriendAcceptedNotifications).toBe(false);
    expect(result.settings.receivesGameInviteNotifications).toBe(false);
    expect(result.settings.receivesFriendGameActivityNotifications).toBe(false);
  });

  it("updates password without affecting other fields", async () => {
    const result = await updateUser("alice", { password: "newpassword123" });
    expect(result.username).toBe("alice");
  });

  it("partial update only changes specified fields", async () => {
    await updateUser("alice", { display: "Alice", bio: "Original bio" });
    const result = await updateUser("alice", { display: "New Alice" });
    expect(result.display).toBe("New Alice");
    expect(result.bio).toBe("Original bio");
  });
});

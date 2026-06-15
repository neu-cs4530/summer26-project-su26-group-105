import { describe, expect, it } from "vitest";
import { populateSafeSelfUserInfo, updateUser } from "../../src/services/user.service.ts";
import { enforceAuth } from "../../src/services/auth.service.ts";

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

  it("should update a user's background music setting", async () => {
    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusic: "arcade",
      },
    });

    expect(updatedUser.settings.backgroundMusic).toBe("arcade");
  });

  it("should change a user's background music from one track to another", async () => {
    await updateUser("user1", {
      settings: {
        backgroundMusic: "lofi",
      },
    });

    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusic: "sleepy",
      },
    });

    expect(updatedUser.settings.backgroundMusic).toBe("sleepy");
  });

  it("should turn background music off", async () => {
    await updateUser("user1", {
      settings: {
        backgroundMusic: "arcade",
      },
    });

    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusic: "off",
      },
    });

    expect(updatedUser.settings.backgroundMusic).toBe("off");
  });

  it("should update a user's background music volume setting", async () => {
    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusicVolume: 0.5,
      },
    });

    expect(updatedUser.settings.backgroundMusicVolume).toBe(0.5);
  });

  it("should change a user's background music volume more than once", async () => {
    await updateUser("user1", {
      settings: {
        backgroundMusicVolume: 0.75,
      },
    });

    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusicVolume: 0.1,
      },
    });

    expect(updatedUser.settings.backgroundMusicVolume).toBe(0.1);
  });

  it("should keep the selected music track when only the volume changes", async () => {
    await updateUser("user1", {
      settings: {
        backgroundMusic: "lofi",
      },
    });

    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusicVolume: 0.6,
      },
    });

    expect(updatedUser.settings.backgroundMusic).toBe("lofi");
    expect(updatedUser.settings.backgroundMusicVolume).toBe(0.6);
  });

  it("should keep the selected volume when only the music track changes", async () => {
    await updateUser("user1", {
      settings: {
        backgroundMusicVolume: 0.4,
      },
    });

    const updatedUser = await updateUser("user1", {
      settings: {
        backgroundMusic: "arcade",
      },
    });

    expect(updatedUser.settings.backgroundMusic).toBe("arcade");
    expect(updatedUser.settings.backgroundMusicVolume).toBe(0.4);
  });

  it("should give users default background music settings", async () => {
    const user = await enforceAuth({ username: "user1", password: "pwd1111" });
    const safeUser = await populateSafeSelfUserInfo(user.userId);

    expect(safeUser.settings.backgroundMusic).toBeDefined();
    expect(safeUser.settings.backgroundMusicVolume).toBeDefined();
  });
});

import {
  type SafeUserInfo,
  type UserUpdateRequest,
  type SafeSelfUserInfo,
  type RecentlyPlayedEntry,
  type AvatarDecoration,
} from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { GameRepo, UserRepo } from "../repository.ts";
import type { UserRecord } from "../models.ts";
import { createHash } from "node:crypto";

const disallowedUsernames = new Set(["login", "signup", "list"]);

/**
 * Gets a user databased record into public safe user information
 * @param record the user database record to convert
 * @returns public safe user info without private settings
 */
export function recordToSafeUserInfo(record: UserRecord): SafeUserInfo {
  return {
    username: record.username,
    display: record.display,
    decorations: record.decorations,
    createdAt: new Date(record.createdAt),
    bio: record.bio,
    image: record.image,
    socialMedias: record.socialMedias,
    isBot: false,
  };
}

/**
 * Gets a user database record into safe user information for the logged in user
 * @param record the user database record to convert
 * @returns the safe user info with the user's private settings
 */
function recordToSafeSelfUserInfo(record: UserRecord): SafeSelfUserInfo {
  return {
    ...recordToSafeUserInfo(record),
    settings: {
      receivesFriendRequestNotifications: record.settings.receivesFriendRequestNotifications,
      receivesFriendAcceptedNotifications: record.settings.receivesFriendAcceptedNotifications,
      receivesGameInviteNotifications: record.settings.receivesGameInviteNotifications,
      receivesFriendGameActivityNotifications:
        record.settings.receivesFriendGameActivityNotifications,
    },
  };
}

/**
 * Given an id, generates a deterministic set of avatar decorations for a bot user.
 * @param id - the bot user's id, which should be in the format "bot_[displayName]"
 * @returns a list of avatar decorations
 */
function generateBotDecorations(id: string) {
  const decorations: AvatarDecoration[] = [];
  let decorId = 0;

  function getRandomNumber(key: string, range: number) {
    return (
      createHash("sha256")
        .update(id + key)
        .digest()
        .readUInt32BE() % range
    );
  }

  if (getRandomNumber("hashat", 2)) {
    const hats: AvatarDecoration["type"][] = ["tophat", "party"];
    const hat = hats[getRandomNumber("hattype", hats.length)];
    const angle = getRandomNumber("hatangle", 30) - 15;
    const x = 30 + getRandomNumber("hatx", 11) - 5;
    const y = 0 + getRandomNumber("haty", 11) - 5;
    decorations.push({
      type: hat,
      id: decorId++,
      x,
      y,
      rotation: angle,
    });
  }

  // Bots with shirts should be more rare since shirts take up more of the avatar
  if (getRandomNumber("hasshirt", 4) === 0) {
    const shirts: AvatarDecoration["type"][] = ["sweater", "suit"];
    const shirt = shirts[getRandomNumber("shirttype", shirts.length)];
    const angle = getRandomNumber("shirtangle", 30) - 15;
    const x = 0 + getRandomNumber("shirtx", 11) - 5;
    const y = 40 + getRandomNumber("shirty", 11) - 5;
    decorations.push({
      type: shirt,
      id: decorId++,
      x,
      y,
      rotation: angle,
    });
  }

  if (getRandomNumber("hasneckdecor", 2)) {
    const neck = "bowtie";
    const angle = getRandomNumber("neckangle", 30) - 15;
    const x = 25 + getRandomNumber("neckx", 11) - 5;
    const y = 30 + getRandomNumber("necky", 11) - 5;
    decorations.push({
      type: neck,
      id: decorId++,
      x,
      y,
      rotation: angle,
    });
  }

  if (getRandomNumber("hasglasses", 2)) {
    const allGlasses: AvatarDecoration["type"][] = ["sunglasses", "glasses", "goggles"];
    const glasses = allGlasses[getRandomNumber("glassestype", allGlasses.length)];
    const angle = getRandomNumber("glassesangle", 30) - 15;
    const x = 20 + getRandomNumber("glassesx", 11) - 5;
    const y = 20 + getRandomNumber("glassesy", 11) - 5;
    decorations.push({
      type: glasses,
      id: decorId++,
      x,
      y,
      rotation: angle,
    });
  }

  return decorations;
}

/**
 * Retrieves a single user from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object (without the password).
 */
export async function populateSafeUserInfo(userId: string): Promise<SafeUserInfo> {
  // Catch bot IDs and return a virtual profile without messing with the database
  if (userId.startsWith("bot_")) {
    const parts = userId.split(":");
    const displayName = parts[1];
    return {
      username: userId,
      // robot emoji cause why not hehe
      display: `🤖 ${displayName}`,
      createdAt: new Date(),
      image: null,
      decorations: generateBotDecorations(userId),
      bio: `Hi, I'm ${displayName}!`,
      socialMedias: [],
      isBot: true,
    };
  }
  const record = await UserRepo.get(userId);
  return recordToSafeUserInfo(record);
}

/**
 * Retrieves the current user's safe private user information from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object with private settings but without the password.
 */
export async function populateSafeSelfUserInfo(userId: string): Promise<SafeSelfUserInfo> {
  const record = await UserRepo.get(userId);
  return recordToSafeSelfUserInfo(record);
}

/**
 * Retrieves a list of recently played games for a user, sorted by most recent.
 * @param userId - Valid user id.
 * @returns a list of the 3 most recently played games, sorted by most recent
 */
export async function populateRecentlyPlayedGames(userId: string): Promise<RecentlyPlayedEntry[]> {
  const gameKeys = await GameRepo.getAllKeys();
  const games = (await GameRepo.getMany(gameKeys)).map((game, i) => [gameKeys[i], game] as const);
  const recentlyPlayed: RecentlyPlayedEntry[] = [];
  for (const [id, game] of games) {
    if (game.endedAt)
      if (game.players.some((p) => p === userId)) {
        recentlyPlayed.push({
          gameId: id,
          gameType: game.type,
          datePlayed: new Date(game.endedAt),
        });
      }
  }

  return recentlyPlayed.sort((a, b) => +b.datePlayed - +a.datePlayed).slice(0, 3);
}

/**
 * Create and store a new user
 *
 * @param newUser - The user object to be saved, containing user details like username, password, etc.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export async function createUser(
  username: string,
  password: string,
  createdAt: Date,
): Promise<SafeSelfUserInfo | { error: string }> {
  if ((await getUserByUsername(username)) !== null) {
    return { error: "User already exists" };
  }
  if (disallowedUsernames.has(username)) {
    return { error: "That is not a permitted username" };
  }
  const record = {
    username,
    createdAt: createdAt.toISOString(),
    display: username,
    bio: `Hi, I'm ${username}!`,
    image: null,
    decorations: [],
    socialMedias: [],
    settings: {
      receivesFriendRequestNotifications: true,
      receivesFriendAcceptedNotifications: true,
      receivesGameInviteNotifications: true,
      receivesFriendGameActivityNotifications: true,
    },
  };
  const id = await UserRepo.add(record);
  await updateAuth(username, password, id);
  return recordToSafeSelfUserInfo(record);
}

/**
 * Retrieves a list of usernames from the database
 *
 * @param usernames - A list of usernames
 * @returns the SafeUserInfo objects corresponding to those users
 * @throws if any of the usernames are not valid
 */
export async function getUsersByUsername(usernames: string[]): Promise<SafeUserInfo[]> {
  return Promise.all(
    usernames.map(async (username) => {
      const user = await getUserByUsername(username);
      if (user === null) {
        throw new Error(`No user ${username}`);
      }
      return populateSafeUserInfo(user.userId);
    }),
  );
}

/**
 * Updates user information in the database
 *
 * @param username - A valid username for the user to update
 * @param updates - An object that defines the fields to be updated and their new values
 * @returns the updated user object (without the password)
 * @throws if the username does not exist in the database
 */
export async function updateUser(
  username: string,
  { display, password, bio, image, decorations, socialMedias, settings }: UserUpdateRequest,
): Promise<SafeSelfUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (password !== undefined) await updateAuth(username, password, user.userId);
  const newUser = await UserRepo.get(user.userId);
  newUser.settings = {
    receivesFriendRequestNotifications: newUser.settings.receivesFriendRequestNotifications ?? true,
    receivesFriendAcceptedNotifications:
      newUser.settings.receivesFriendAcceptedNotifications ?? true,
    receivesGameInviteNotifications: newUser.settings.receivesGameInviteNotifications ?? true,
    receivesFriendGameActivityNotifications:
      newUser.settings.receivesFriendGameActivityNotifications ?? true,
  };
  if (display !== undefined) newUser.display = display;
  if (bio !== undefined) newUser.bio = bio;
  if (image !== undefined) newUser.image = image;
  if (decorations) newUser.decorations = decorations;
  if (socialMedias !== undefined) newUser.socialMedias = socialMedias;
  if (settings) {
    const {
      receivesFriendRequestNotifications,
      receivesFriendAcceptedNotifications,
      receivesGameInviteNotifications,
      receivesFriendGameActivityNotifications,
    } = settings;
    if (receivesFriendRequestNotifications !== undefined)
      newUser.settings.receivesFriendRequestNotifications = receivesFriendRequestNotifications;
    if (receivesFriendAcceptedNotifications !== undefined)
      newUser.settings.receivesFriendAcceptedNotifications = receivesFriendAcceptedNotifications;
    if (receivesGameInviteNotifications !== undefined)
      newUser.settings.receivesGameInviteNotifications = receivesGameInviteNotifications;
    if (receivesFriendGameActivityNotifications !== undefined)
      newUser.settings.receivesFriendGameActivityNotifications =
        receivesFriendGameActivityNotifications;
  }
  await UserRepo.set(user.userId, newUser);
  return populateSafeSelfUserInfo(user.userId);
}

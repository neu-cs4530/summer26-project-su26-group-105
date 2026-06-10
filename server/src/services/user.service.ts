import { type SafeUserInfo, type UserUpdateRequest } from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { UserRepo } from "../repository.ts";
import type { UserRecord } from "../models.ts";

const disallowedUsernames = new Set(["login", "signup", "list"]);

function recordToSafeUserInfo(record: UserRecord): SafeUserInfo {
  return {
    username: record.username,
    display: record.display,
    createdAt: new Date(record.createdAt),
    bio: record.bio,
    image: record.image,
    socialMedias: record.socialMedias,
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
      bio: `Hi, I'm ${displayName}!`,
      socialMedias: [],
      settings: {
        receivesFriendGameNotifications: false,
        receivesFriendRequestNotifications: false,
      },
    };
  }
  const record = await UserRepo.get(userId);
  return recordToSafeUserInfo(record);
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
): Promise<SafeUserInfo | { error: string }> {
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
  return recordToSafeUserInfo(record);
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
  { display, password, bio, image, socialMedias, settings }: UserUpdateRequest,
): Promise<SafeUserInfo> {
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
  return populateSafeUserInfo(user.userId);
}

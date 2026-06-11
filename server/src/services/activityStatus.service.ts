import { type GameServer } from "../types.ts";
import { getFriends } from "./friend.service.ts";
import { UserRepo } from "../repository.ts";

export type ActivityStatus = "online" | "idle" | "dnd" | "offline";

/**
 * In-memory map of userId -> ActivityStatus.
 * Resets on server restart — intentional, since status is session-based.
 */
const statusMap = new Map<string, ActivityStatus>();

/**
 * Returns the current activity status for a user.
 * Defaults to "offline" if not tracked.
 */
export function getStatus(userId: string): ActivityStatus {
  return statusMap.get(userId) ?? "offline";
}

/**
 * Sets the activity status for a user and pushes the update to all
 * of their online friends via their personal friend rooms.
 */
export async function setStatus(
  io: GameServer,
  userId: string,
  status: ActivityStatus,
): Promise<void> {
  statusMap.set(userId, status);
  await pushStatusToFriends(io, userId, status);
}

/**
 * Removes a user from the status map (on disconnect) and notifies friends
 * they are now offline.
 */
export async function clearStatus(io: GameServer, userId: string): Promise<void> {
  statusMap.delete(userId);
  await pushStatusToFriends(io, userId, "offline");
}

/**
 * Emits `friendStatusUpdated` to all online friends of the current user.
 * Includes username so the client can look up status by either userId or username.
 */
async function pushStatusToFriends(
  io: GameServer,
  userId: string,
  status: ActivityStatus,
): Promise<void> {
  const friends = await getFriends(userId);
  if (friends.length === 0) return;

  // Look up the username for the user whose status changed
  const userRecord = await UserRepo.find(userId);
  const username = userRecord?.username ?? null;

  for (const friend of friends) {
    io.to(`friend-${friend.userId}`).emit("friendStatusUpdated", { userId, username, status });
  }
}

/**
 * Returns a userId -> ActivityStatus map for a list of user ids.
 * Used to populate initial statuses when loading the friends list.
 */
export function getStatusMap(userIds: string[]): Record<string, ActivityStatus> {
  const result: Record<string, ActivityStatus> = {};
  for (const id of userIds) {
    result[id] = statusMap.get(id) ?? "offline";
  }
  return result;
}

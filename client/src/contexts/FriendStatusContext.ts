import { createContext, useContext } from "react";
import type { ActivityStatus } from "@gamenite/shared/src/friend.types";

/**
 * Maps userId -> ActivityStatus for all known friends.
 * Only populated for users who are friends with the current user.
 */
export type FriendStatusMap = Map<string, ActivityStatus>;

export const FriendStatusContext = createContext<FriendStatusMap>(new Map());

/**
 * Returns the activity status for a given userId.
 * Returns "offline" if not found (if user is not a friend or not tracked).
 */
export function useFriendStatus(username: string): ActivityStatus | undefined {
  const map = useContext(FriendStatusContext);
  return map.get(username); // returns undefined if not a friend
}

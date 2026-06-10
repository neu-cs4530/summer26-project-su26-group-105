/**
 * Activity status for a user.
 * - `online`: actively connected
 * - `idle`: connected but manually set to idle
 * - `dnd`: do not disturb — connected but limiting notifications
 * - `offline`: not connected (or status not visible)
 */
export type ActivityStatus = "online" | "idle" | "dnd" | "offline";

/**
 * Represents a friend or pending request entry, safe to send to the client.
 */
export interface FriendEntry {
  friendId: string;
  userId: string;
  username: string;
  display: string;
  image: string | null;
  requestDirection: "incoming" | "outgoing" | "mutual";
  activityStatus: ActivityStatus;
}

/**
 * Represents a user search result, annotated with their relationship
 * to the searching user.
 */
export interface SearchResult {
  userId: string;
  username: string;
  display: string;
  relationship: "friend" | "incoming" | "outgoing" | "none";
}

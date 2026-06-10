/**
 * Represents a friend or pending request entry, safe to send to the client.
 */
export interface FriendEntry {
  friendId: string;
  userId: string;
  username: string;
  display: string;
  requestDirection: "incoming" | "outgoing" | "mutual";
}

/**
 * Represents a user search result, based on their relationship to the
 * user that is searching.
 */
export interface SearchResult {
  userId: string;
  username: string;
  display: string;
  relationship: "friend" | "incoming" | "outgoing" | "none";
}

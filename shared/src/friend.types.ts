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

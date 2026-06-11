import { useEffect, useState, useCallback } from "react";
import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import type { FriendEntry, SearchResult } from "@gamenite/shared/src/friend.types";

/**
 * Custom hook to manage socket connection for friends page.
 * @throws if outside a LoginContext
 * @returns an object containing:
 * - `friends`: the current friends the user has accepted
 * - `incoming`: the pending incoming friend requests
 * - `outgoing`: the pending outgoing friend requests
 * - `blocked`: the users blocked by the current user
 * - `searchResults`: the results from the search query
 * - `acceptRequest`: accepts a pending friend request
 * - `declineRequest`: decline a pending friend request
 * - `removeFriend`: removes an existing friend from user's accepted friends
 * - `blockUser`: blocks a user (doesn't have to be an existing friend)
 * - `unblockUser`: unblocks a user that was previously blocked
 * - `searchUsers`: searches all users by username or display name
 */
export default function useSocketsForFriends() {
  const { socket } = useLoginContext();
  const auth = useAuth();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [blocked, setBlocked] = useState<FriendEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const handleFriendListUpdated = (payload: {
      friends: FriendEntry[];
      incoming: FriendEntry[];
      outgoing: FriendEntry[];
      blocked: FriendEntry[];
    }) => {
      setFriends(payload.friends);
      setIncoming(payload.incoming);
      setOutgoing(payload.outgoing);
      setBlocked(payload.blocked);
    };

    const handleSearchResults = (payload: { results: SearchResult[] }) => {
      setSearchResults(payload.results);
    };
    socket.on("friendListUpdated", handleFriendListUpdated);
    socket.on("friendSearchResults", handleSearchResults);
    socket.emit("friendList", { auth, payload: {} });

    return () => {
      socket.off("friendListUpdated", handleFriendListUpdated);
      socket.off("friendSearchResults", handleSearchResults);
    };
  }, [socket, auth]);

  function sendRequest(username: string) {
    socket.emit("friendRequest", { auth, payload: { username } });
  }

  function acceptRequest(requestId: string) {
    socket.emit("friendAccept", { auth, payload: { requestId } });
  }

  function declineRequest(requestId: string) {
    socket.emit("friendDecline", { auth, payload: { requestId } });
  }

  function removeFriend(requestId: string) {
    socket.emit("friendRemove", { auth, payload: { requestId } });
  }

  function blockUser(username: string) {
    socket.emit("friendBlock", { auth, payload: { username } });
  }

  function unblockUser(username: string) {
    socket.emit("friendUnblock", { auth, payload: { username } });
  }

  const searchUsers = useCallback(
    (query: string, type: "existing" | "all") => {
      socket.emit("friendSearch", { auth, payload: { query, type } });
    },
    [socket, auth],
  );

  return {
    friends,
    incoming,
    outgoing,
    blocked,
    searchResults,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    unblockUser,
    searchUsers,
  };
}

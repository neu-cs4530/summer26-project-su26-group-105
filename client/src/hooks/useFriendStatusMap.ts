import { useEffect, useState } from "react";
import useLoginContext from "./useLoginContext";
import useAuth from "./useAuth";
import type { ActivityStatus, FriendEntry } from "@gamenite/shared/src/friend.types";
import type { FriendStatusMap } from "../contexts/FriendStatusContext";

/**
 * Manages the global friend status map.
 * - Emits `userConnect` on mount so the server registers this user as online
 * - Listens for `friendListUpdated` to seed initial statuses
 * - Listens for `friendStatusUpdated` to keep statuses in sync in real time
 * - Stores statuses by both userId and username so any component can look up
 *   by whichever key it has available
 *
 * Should be called once in Layout.
 */
export default function useFriendStatusMap(): FriendStatusMap {
  const { socket } = useLoginContext();
  const auth = useAuth();
  const [statusMap, setStatusMap] = useState<FriendStatusMap>(new Map());

  useEffect(() => {
    socket.emit("userConnect", { auth, payload: {} });

    const handleFriendListUpdated = (payload: {
      friends: FriendEntry[];
      incoming: FriendEntry[];
      outgoing: FriendEntry[];
      blocked: FriendEntry[];
    }) => {
      setStatusMap((prev) => {
        const next = new Map(prev);
        for (const f of payload.friends) {
          next.set(f.userId, f.activityStatus);
          next.set(f.username, f.activityStatus);
        }
        return next;
      });
    };

    const handleStatusUpdated = (payload: {
      userId: string;
      username: string | null;
      status: ActivityStatus;
    }) => {
      setStatusMap((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, payload.status);
        if (payload.username) next.set(payload.username, payload.status);
        return next;
      });
    };

    socket.on("friendListUpdated", handleFriendListUpdated);
    socket.on("friendStatusUpdated", handleStatusUpdated);

    return () => {
      socket.off("friendListUpdated", handleFriendListUpdated);
      socket.off("friendStatusUpdated", handleStatusUpdated);
    };
  }, [socket, auth]);

  return statusMap;
}

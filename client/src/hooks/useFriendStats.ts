import { useEffect, useState } from "react";
import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import { getFriendStats } from "../services/friendStatsService";
import type { FriendStats } from "../util/friendStatsTypes";

/**
 * Fetches shared game stats between the current user and another user
 *
 * @param username the username of the other user's profile being viewed
 */
export default function useFriendStats(username: string): FriendStats | null {
  const { user } = useLoginContext();
  const auth = useAuth();
  const [stats, setStats] = useState<FriendStats | null>(null);

  useEffect(() => {
    // Don't fetch stats for your own profile
    if (user.username === username) return;

    let ignore = false;
    getFriendStats(auth, username)
      .then((data) => {
        if (!ignore) setStats(data);
      })
      .catch(() => {
        if (!ignore) setStats(null);
      });

    return () => {
      ignore = true;
    };
  }, [auth, username, user.username]);

  return stats;
}

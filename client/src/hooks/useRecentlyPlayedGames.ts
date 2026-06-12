import { useEffect, useState } from "react";
import type { RecentlyPlayedEntry } from "@gamenite/shared";
import { getRecentlyPlayed } from "../services/userService";

/**
 * A custom hook to fetch recently played games for a given user.
 * @param username The username of the user whose recently played games to fetch.
 * @returns An array of recently played games.
 */
export default function useRecentlyPlayedGames(username: string) {
  const [recentlyPlayedGames, setRecentlyPlayedGames] = useState<RecentlyPlayedEntry[]>([]);

  useEffect(() => {
    getRecentlyPlayed(username)
      .then(setRecentlyPlayedGames)
      .catch(() => {
        setRecentlyPlayedGames([]);
      });
  }, [username]);

  return recentlyPlayedGames;
}

import { useEffect, useState } from "react";
import type { RecentlyPlayedEntry } from "@gamenite/shared";
import { getRecentlyPlayed } from "../services/userService";

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

import { useEffect, useState } from "react";
import type { GameKey, LeaderboardPlayer } from "@gamenite/shared";
import { gameNames } from "../../util/consts";
import { getLeaderboardList } from "../../services/leaderboardService";

/**
 * Gets the leaderboard stats needed for the profile page game bars.
 * @param username the username of the profile being viewed
 * @returns the leaderboard player, game entries, and helper for game bar widths
 */
export default function useProfileStats(username: string) {
  //stores leaderboard row for profile user once its gotten
  const [leaderboardPlayer, setLeaderboardPlayer] = useState<LeaderboardPlayer | undefined>();

  //loads global leaderboard and finds this profile
  useEffect(() => {
    void getLeaderboardList({ leaderboard: "global", dateShow: "all" }).then((rows) => {
      setLeaderboardPlayer(rows.find((row) => row.user.username === username));
    });
  }, [username]);

  //convers the game names into entries so each game can be a stat
  const gameEntries = Object.entries(gameNames) as [GameKey, string][];

  //gets largest game count (100% of bar) so every other game is relative to this game
  const maxGameCount = Math.max(
    1,
    ...gameEntries.map(([gameKey]) => leaderboardPlayer?.gameCounts[gameKey] ?? 0),
  );

  //gets how wide each game bar should be based on how many games the user played
  function getGameBarWidth(gameCount: number) {
    if (gameCount === 0) {
      return "0%";
    }

    return `${(gameCount / maxGameCount) * 100}%`;
  }

  return {
    leaderboardPlayer,
    gameEntries,
    getGameBarWidth,
  };
}

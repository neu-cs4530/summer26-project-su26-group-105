import type {
  GameKey,
  LeaderboardPlayer,
  SafeUserInfo,
  DateShow,
  LeaderboardServerFilters,
} from "@gamenite/shared";
import { GameRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";

//stores the stats for a single player for the leaderboard
type LeaderboardStats = {
  user: SafeUserInfo;
  totalGames: number;
  totalWins: number;
  rankPoints: number;
  gameCounts: Partial<Record<GameKey, number>>;
  gameWins: Partial<Record<GameKey, number>>;
};

//gets the player's rank into a status
//gets the player's points into a status
function statusForPoints(rankPoints: number): string {
  if (rankPoints >= 500) {
    return "Champion";
  }

  if (rankPoints >= 300) {
    return "Platinum";
  }

  if (rankPoints >= 200) {
    return "Gold";
  }

  if (rankPoints >= 100) {
    return "Silver";
  }

  if (rankPoints >= 3) {
    return "Bronze";
  }

  return "Unranked";
}

//gets existing leaderboard stats for a player
//creates a new stat if this is the first game for the given player
function getOrCreatePlayerStats(
  stats: Map<string, LeaderboardStats>,
  user: SafeUserInfo,
): LeaderboardStats {
  //creates an entry if they're not in the leaderboard
  if (!stats.has(user.username)) {
    stats.set(user.username, {
      user,
      totalGames: 0,
      totalWins: 0,
      rankPoints: 0,
      gameCounts: {},
      gameWins: {},
    });
  }

  //gets the player's stat from leaderboard
  const playerStats = stats.get(user.username);

  //throws error if theres no player stat
  if (playerStats === undefined) {
    throw new Error(`No leaderboard stats for ${user.username}`);
  }

  return playerStats;
}

/**
 * Checks if a finished game should be shown for the selected data filter
 * @param endedAt the time the game ended or undefined if it hasn't
 * @param dateShow the selected date filter (all, daily, weekly)
 * @returns true if the game matches the selected date filter
 */
function isGameInDateFilter(endedAt: string | undefined, dateShow: DateShow) {
  //show everything when all time
  if (dateShow === "all") {
    return true;
  }

  //do not include unfinished games on leaderboard
  if (endedAt === undefined) {
    return false;
  }

  //converts end time into object so it can be compared
  const endedDate = new Date(endedAt);
  const now = new Date();

  //if daily, then show only games finished today
  if (dateShow === "daily") {
    return endedDate.toDateString() === now.toDateString();
  }

  //move date back 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  return endedDate >= oneWeekAgo;
}

/**
 * Gets the leaderboard rows by calculating the player's stat for a game
 * For global, all games are shown. For a game specific, only those finished games will show
 * @param type the selected leaderboard
 * @returns the leaderboard rows sorted by the total wins
 */
export async function getLeaderboard(
  filters: LeaderboardServerFilters,
): Promise<LeaderboardPlayer[]> {
  //gets every game id from the database
  const gameIds = await GameRepo.getAllKeys();
  const stats = new Map<string, LeaderboardStats>();

  for (const gameId of gameIds) {
    const game = await GameRepo.get(gameId);
    //game must have a winner and be done
    if (!game.done || !game.winner) {
      continue;
    }

    if (!isGameInDateFilter(game.endedAt, filters.dateShow)) {
      continue;
    }

    //if this is a game specific leaderboard and the game is not the selected game, skip it
    if (filters.leaderboard !== "global" && game.type !== filters.leaderboard) {
      continue;
    }

    //loops through all game players and counts their played games and wins
    for (let i = 0; i < game.players.length; i += 1) {
      const player = await populateSafeUserInfo(game.players[i]);
      const playerStats = getOrCreatePlayerStats(stats, player);

      playerStats.totalGames += 1;
      playerStats.gameCounts[game.type] = (playerStats.gameCounts[game.type] ?? 0) + 1;
      //only counts win if the user id matches the stored game winner
      if (game.players[i] === game.winner) {
        playerStats.totalWins += 1;
        playerStats.rankPoints += 10;
        playerStats.gameWins[game.type] = (playerStats.gameWins[game.type] ?? 0) + 1;
      } else {
        playerStats.rankPoints = Math.max(0, playerStats.rankPoints - 5);
      }
    }
  }

  //takes stats and turns into final array for frontend table
  return Array.from(stats.values())
    .sort((a, b) => {
      if (b.rankPoints !== a.rankPoints) {
        return b.rankPoints - a.rankPoints;
      }

      return b.totalWins - a.totalWins;
    })
    .map((playerStats, index) => ({
      rank: index + 1,
      status: statusForPoints(playerStats.rankPoints),
      user: playerStats.user,
      totalGames: playerStats.totalGames,
      totalWins: playerStats.totalWins,
      rankPoints: playerStats.rankPoints,
      gameCounts: playerStats.gameCounts,
      gameWins: playerStats.gameWins,
    }));
}

import type { GameKey } from "@gamenite/shared";
import { GameRepo } from "../repository.ts";
import { getFriends } from "./friend.service.ts";
import { getUserByUsername } from "./auth.service.ts";

export interface SharedGameStats {
  gameType: GameKey;
  gamesPlayed: number;
  userAWins: number;
  userBWins: number;
}

export interface FriendStats {
  isFriend: boolean;
  totalGamesPlayedTogether: number;
  userATotalWins: number;
  userBTotalWins: number;
  byGame: SharedGameStats[];
}

/**
 * Calculates shared game stats between two users,
 * returns isFriend: false if they are not friends.
 *
 * @param usernameA - the viewing user's username
 * @param usernameB - the profile being viewed username
 */
export async function getFriendStats(usernameA: string, usernameB: string): Promise<FriendStats> {
  const userA = await getUserByUsername(usernameA);
  const userB = await getUserByUsername(usernameB);

  if (!userA || !userB) {
    return {
      isFriend: false,
      totalGamesPlayedTogether: 0,
      userATotalWins: 0,
      userBTotalWins: 0,
      byGame: [],
    };
  }

  // check for friendship
  const friends = await getFriends(userA.userId);
  const isFriend = friends.some((f) => f.userId === userB.userId);
  if (!isFriend) {
    return {
      isFriend: false,
      totalGamesPlayedTogether: 0,
      userATotalWins: 0,
      userBTotalWins: 0,
      byGame: [],
    };
  }

  // collect all games users played together
  const gameIds = await GameRepo.getAllKeys();
  const byGame = new Map<GameKey, SharedGameStats>();

  let totalGamesPlayedTogether = 0;
  let userATotalWins = 0;
  let userBTotalWins = 0;

  for (const gameId of gameIds) {
    const game = await GameRepo.get(gameId);
    if (!game.done) continue;

    const aPlayed = game.players.includes(userA.userId);
    const bPlayed = game.players.includes(userB.userId);
    if (!aPlayed || !bPlayed) continue;

    totalGamesPlayedTogether += 1;

    if (!byGame.has(game.type)) {
      byGame.set(game.type, { gameType: game.type, gamesPlayed: 0, userAWins: 0, userBWins: 0 });
    }

    const entry = byGame.get(game.type)!;
    entry.gamesPlayed += 1;

    if (game.winner === userA.userId) {
      entry.userAWins += 1;
      userATotalWins += 1;
    } else if (game.winner === userB.userId) {
      entry.userBWins += 1;
      userBTotalWins += 1;
    }
  }

  return {
    isFriend: true,
    totalGamesPlayedTogether,
    userATotalWins,
    userBTotalWins,
    byGame: Array.from(byGame.values()),
  };
}

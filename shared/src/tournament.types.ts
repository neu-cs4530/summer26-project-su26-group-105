import { z } from "zod";
import { type GameKey, type GameInfo, zGameKey } from "./game.types.ts";
import { type SafeUserInfo } from "./user.types.ts";

/**
 * A tournament is a bracket of games of a single game type
 *
 * `bracketSize` must be an exact power of `gameSize`.
 */
export type TournamentStatus = "registering" | "active" | "done";

/**
 * Tournament information needed to render the bracket page
 * - `tournamentId`: database key
 * - `type`: which game is played in every match
 * - `status`: registering, active, or done
 * - `gameSize`: players per match
 * - `bracketSize`: total number of participants
 * - `participants`: everyone registered for the tournament
 * - `rounds`: matches grouped by round
 * - `champion`: the overall winner, set once `status` is `done`
 * - `createdBy`: who created the tournament
 * - `createdAt`: when the tournament was created
 * - `friendOnly`: if true, only friends of the creator may register
 */
export interface TournamentInfo {
  tournamentId: string;
  type: GameKey;
  status: TournamentStatus;
  gameSize: number;
  bracketSize: number;
  participants: SafeUserInfo[];
  rounds: GameInfo[][];
  champion?: SafeUserInfo;
  createdBy: SafeUserInfo;
  createdAt: Date;
  friendOnly?: boolean;
}

/** The largest bracket a tournament may have */
export const MAX_BRACKET_SIZE = 64;

/**
 * Returns true if `n` is an exact power of `base` (base^k for some integer
 * k >= 1)
 */
export function isPowerOf(n: number, base: number): boolean {
  if (!Number.isInteger(n) || !Number.isInteger(base) || base < 2 || n < base) {
    return false;
  }
  let value = base;
  while (value < n) {
    value *= base;
  }
  return value === n;
}

/**
 * The bracket sizes a creator may choose for a given `gameSize
 *
 * @param gameSize - players per match (>= 2)
 * @returns the valid bracket sizes in ascending order, or [] for invalid input
 */
export function validBracketSizes(gameSize: number): number[] {
  if (!Number.isInteger(gameSize) || gameSize < 2) return [];
  const sizes: number[] = [];
  for (let size = gameSize * gameSize; size <= MAX_BRACKET_SIZE; size *= gameSize) {
    sizes.push(size);
  }
  return sizes;
}

/**
 * Payload for creating a tournament
 */
export type CreateTournamentPayload = z.infer<typeof zCreateTournamentPayload>;
export const zCreateTournamentPayload = z.object({
  gameKey: zGameKey,
  gameSize: z.number().int().min(2),
  bracketSize: z.number().int().min(4),
  friendOnly: z.boolean().default(false),
});

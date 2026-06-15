import { z } from "zod";

export type CardColor = "red" | "blue" | "green" | "yellow" | "wild";
export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wildDraw4";

export interface Card {
  id: string; // Required for specific duplicates in hand
  color: CardColor;
  value: CardValue;
}

export type OneAction =
  | {
      type: "play";
      card: Card;
      userIndex: number;
    }
  | {
      type: "draw";
      amount: number;
      cardIds: string[];
      userIndex: number;
    };

/**
 * Internal Game State (server side)
 */
export interface OneState {
  deck: Card[];
  discardPile: Card[];
  playerHands: Card[][]; // Indexed by playerIndex
  nextPlayer: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  activeColor: CardColor; // Tracks chosen color after a wild card is played
  hasDrawnThisTurn: boolean;
  lastTurnActions: OneAction[]; // For tracking what happened on the last turn
}

/**
 * Client View of the game
 * Hides other players' actual cards and the deck
 */
export interface OneView {
  discardTop: Card;
  activeColor: CardColor;
  nextPlayer: number;
  direction: 1 | -1;
  yourHand: Card[]; // Empty if spectator (playerIndex === -1)
  playerHandIds: string[][]; // Index maps to player index, contains card IDs
  deckCount: number;
  hasDrawnThisTurn: boolean;
  lastTurnActions: OneAction[]; // For showing recent actions in the UI
}

/**
 * Zod validation for incoming move
 */
export const zPlayCardMove = z.object({
  type: z.literal("play"),
  cardId: z.string(),
  chosenColor: z.enum(["red", "blue", "green", "yellow"]).optional(), // Required if playing a wild
});

/**
 * Drawing a card
 */
export const zDrawCardMove = z.object({
  type: z.literal("draw"),
});
/**
 * Pass turn after drawing card
 */
export const zPassTurnMove = z.object({
  type: z.literal("pass"),
});

export const zOneMove = z.discriminatedUnion("type", [zPlayCardMove, zDrawCardMove, zPassTurnMove]);

export type OneMove = z.infer<typeof zOneMove>;

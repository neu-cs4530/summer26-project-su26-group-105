import { oneAnimationDurations } from "@gamenite/shared";
import { type OneState, type OneMove } from "../../../shared/src/games/one.types.ts";

/**
 * Evaluates the current state and returns all legal moves available to a player index
 */
export function getLegalMoves(state: OneState, playerIndex: number): OneMove[] {
  if (state.nextPlayer !== playerIndex) return [];

  const moves: OneMove[] = [];
  const currentHand = state.playerHands[playerIndex];
  const topCard = state.discardPile[state.discardPile.length - 1];
  const colors: ("red" | "blue" | "green" | "yellow")[] = ["red", "blue", "green", "yellow"];

  // Player has not drawn yet this turn
  if (!state.hasDrawnThisTurn) {
    moves.push({ type: "draw" });

    for (const card of currentHand) {
      const isMatch =
        card.color === "wild" || card.color === state.activeColor || card.value === topCard.value;

      if (isMatch) {
        if (card.color === "wild") {
          for (const color of colors) {
            moves.push({ type: "play", cardId: card.id, chosenColor: color });
          }
        } else {
          moves.push({ type: "play", cardId: card.id });
        }
      }
    }
  }
  //  has drawn a card and must now choose to play it or pass
  else {
    moves.push({ type: "pass" });

    // The card just drawn sits at the very end of the array
    const justDrawnCard = currentHand[currentHand.length - 1];
    if (justDrawnCard) {
      const isMatch =
        justDrawnCard.color === "wild" ||
        justDrawnCard.color === state.activeColor ||
        justDrawnCard.value === topCard.value;

      if (isMatch) {
        if (justDrawnCard.color === "wild") {
          for (const color of colors) {
            moves.push({ type: "play", cardId: justDrawnCard.id, chosenColor: color });
          }
        } else {
          moves.push({ type: "play", cardId: justDrawnCard.id });
        }
      }
    }
  }

  return moves;
}

/**
 * Selects a random valid move for a bot player.
 */
export async function generateBotMove(
  state: OneState,
  botPlayerIndex: number,
): Promise<OneMove | null> {
  // Wait the length of any animations that should've happened
  await new Promise((res) =>
    setTimeout(
      res,
      state.lastTurnActions.reduce((prev, a) => prev + oneAnimationDurations[a.type], 0),
    ),
  );

  const legalMoves = getLegalMoves(state, botPlayerIndex);
  if (legalMoves.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}

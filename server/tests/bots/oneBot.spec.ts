import { describe, expect, it } from "vitest";
import { getLegalMoves, generateBotMove } from "../../src/bots/oneBot.ts";
import { type OneState } from "@gamenite/shared/src/games/one.types.ts";

// Helper to construct mock clean states
function createMockOneState(customFields: Partial<OneState> = {}): OneState {
  return {
    nextPlayer: 0,
    hasDrawnThisTurn: false,
    activeColor: "red",
    discardPile: [{ id: "c1", color: "red", value: "7" }],
    playerHands: [
      [{ id: "hand1", color: "red", value: "3" }], // Player 0
      [{ id: "hand2", color: "blue", value: "2" }], // Player 1
    ],
    direction: 1,
    deck: [],
    lastTurnActions: [],
    ...customFields,
  };
}

describe("One Bot Brain Unit Tests", () => {
  describe("getLegalMoves", () => {
    it("returns empty array when it is not the bot's turn", () => {
      const state = createMockOneState({ nextPlayer: 1 });
      const moves = getLegalMoves(state, 0); // Check for player 0
      expect(moves).toHaveLength(0);
    });

    it("allows drawing a card and matching color plays when not drawn yet", () => {
      const state = createMockOneState({
        activeColor: "red",
        discardPile: [{ id: "c1", color: "red", value: "7" }],
        playerHands: [
          [
            { id: "match-color", color: "red", value: "2" },
            { id: "no-match", color: "blue", value: "8" },
          ],
        ],
        hasDrawnThisTurn: false,
      });

      const moves = getLegalMoves(state, 0);

      // Should include draw action and the playable matching card
      expect(moves.some((m) => m.type === "draw")).toBe(true);
      expect(moves.some((m) => m.type === "play" && m.cardId === "match-color")).toBe(true);
      expect(moves.some((m) => m.type === "play" && m.cardId === "no-match")).toBe(false);
    });

    it("allows matching numeric values regardless of color compatibility", () => {
      const state = createMockOneState({
        activeColor: "red",
        discardPile: [{ id: "c1", color: "red", value: "7" }],
        playerHands: [[{ id: "match-value", color: "blue", value: "7" }]],
        hasDrawnThisTurn: false,
      });

      const moves = getLegalMoves(state, 0);
      expect(moves.some((m) => m.type === "play" && m.cardId === "match-value")).toBe(true);
    });

    it("offers all four programmatic color permutations when evaluating Wild cards", () => {
      const state = createMockOneState({
        activeColor: "red",
        playerHands: [[{ id: "wild-card", color: "wild", value: "wild" }]],
        hasDrawnThisTurn: false,
      });

      const moves = getLegalMoves(state, 0);
      const playMoves = moves.filter((m) => m.type === "play" && m.cardId === "wild-card");
      expect(playMoves).toHaveLength(4);

      const colors = playMoves.map((m) => (m.type === "play" ? m.chosenColor : undefined));
      expect(colors).toContain("red");
      expect(colors).toContain("blue");
      expect(colors).toContain("green");
      expect(colors).toContain("yellow");
    });

    it("allows passing or playing only the drawn card once a card has been pulled", () => {
      const state = createMockOneState({
        activeColor: "red",
        discardPile: [{ id: "c1", color: "red", value: "7" }],
        playerHands: [
          [
            { id: "hand-stale-match", color: "red", value: "9" }, // Old matching card in hand
            { id: "just-drawn-playable", color: "blue", value: "7" }, // Match value on drawn card
          ],
        ],
        hasDrawnThisTurn: true, // Has drawn this turn
      });

      const moves = getLegalMoves(state, 0);

      expect(moves.some((m) => m.type === "pass")).toBe(true);
      expect(moves.some((m) => m.type === "draw")).toBe(false);
      // Can play the card just drawn (at the end of the hand array)
      expect(moves.some((m) => m.type === "play" && m.cardId === "just-drawn-playable")).toBe(true);
      // Cannot play other cards in hand, even if valid
      expect(moves.some((m) => m.type === "play" && m.cardId === "hand-stale-match")).toBe(false);
    });

    it("offers all four color options if a Wild card is the card just drawn", () => {
      const state = createMockOneState({
        activeColor: "red",
        discardPile: [{ id: "c1", color: "red", value: "7" }],
        playerHands: [
          [
            { id: "stale-card", color: "blue", value: "2" },
            { id: "drawn-wild", color: "wild", value: "wild" }, // Just drew a wild
          ],
        ],
        hasDrawnThisTurn: true,
      });

      const moves = getLegalMoves(state, 0);
      const playMoves = moves.filter((m) => m.type === "play" && m.cardId === "drawn-wild");

      expect(playMoves).toHaveLength(4);
      const colors = playMoves.map((m) => (m.type === "play" ? m.chosenColor : undefined));
      expect(colors).toContain("red");
      expect(colors).toContain("blue");
      expect(colors).toContain("green");
      expect(colors).toContain("yellow");
    });

    it("only allows passing if the drawn card does not match the pile criteria", () => {
      const state = createMockOneState({
        activeColor: "red",
        discardPile: [{ id: "c1", color: "red", value: "7" }],
        playerHands: [
          [
            { id: "stale-card", color: "blue", value: "2" },
            { id: "drawn-no-match", color: "blue", value: "9" }, // Blue 9 does not match Red 7
          ],
        ],
        hasDrawnThisTurn: true,
      });

      const moves = getLegalMoves(state, 0);

      // Must only be able to pass
      expect(moves).toHaveLength(1);
      expect(moves[0].type).toBe("pass");
    });
  });

  describe("generateBotMove", () => {
    it("returns a random valid choice out of legal arrays", async () => {
      const state = createMockOneState();
      const move = await generateBotMove(state, 0);
      expect(move).not.toBeNull();
      expect(["draw", "play"]).toContain(move!.type);
    });

    it("returns null cleanly when no turn actions are mathematically legal", async () => {
      const state = createMockOneState({ nextPlayer: 1 });
      const move = await generateBotMove(state, 0);
      expect(move).toBeNull();
    });
  });
});

import { describe, expect, it } from "vitest";
import { oneLogic } from "../../src/games/one.ts";
import { type OneState, type Card, type OneView } from "../../../shared/src/games/one.types.ts";

// Helper to assemble clean baseline states
function createTestState(customFields: Partial<OneState> = {}): OneState {
  return {
    deck: [
      { id: "d1", color: "red", value: "5" },
      { id: "d2", color: "blue", value: "9" },
    ],
    discardPile: [{ id: "top", color: "red", value: "7" }],
    playerHands: [
      [
        { id: "p0-c1", color: "red", value: "2" },
        { id: "p0-skip", color: "blue", value: "skip" },
      ], // Player 0
      [{ id: "p1-c1", color: "blue", value: "2" }], // Player 1
      [{ id: "p2-c1", color: "green", value: "4" }], // Player 2
    ],
    nextPlayer: 0,
    direction: 1,
    activeColor: "red",
    hasDrawnThisTurn: false,
    lastTurnActions: [],
    ...customFields,
  };
}

describe("One Game Logic Tests", () => {
  describe("start()", () => {
    it("initializes a valid 108 card deck layout split between participants", () => {
      const state = oneLogic.start(3);

      expect(state.playerHands).toHaveLength(3);
      expect(state.playerHands[0]).toHaveLength(7);
      expect(state.discardPile).toHaveLength(1);
      expect(state.discardPile[0].color).not.toBe("wild"); // Verifies non-wild search
      expect(state.nextPlayer).toBe(0);
      expect(state.direction).toBe(1);
      expect(state.hasDrawnThisTurn).toBe(false);
    });
  });

  describe("update() - Turn & Schema Constraints", () => {
    it("returns null instantly if a player acts out of turn order", () => {
      const state = createTestState({ nextPlayer: 0 });
      const result = oneLogic.update(state, { type: "draw" }, 1); // Player 1 acting out of turn
      expect(result).toBeNull();
    });

    it("returns null if payload fails parsing criteria", () => {
      const state = createTestState();
      const result = oneLogic.update(state, { type: "invalidType" }, 0);
      expect(result).toBeNull();
    });
  });

  describe("update() - Draw & Pass Cycle", () => {
    it("allows a player to draw a card, adding it to their hand and setting flag", () => {
      const state = createTestState();
      const result = oneLogic.update(state, { type: "draw" }, 0);

      expect(result).not.toBeNull();
      expect(result!.playerHands[0]).toHaveLength(3); // Card 'd1' pulled inside hand array
      expect(result!.playerHands[0]).toContainEqual({ id: "d1", color: "red", value: "5" });
      expect(result!.deck).toHaveLength(1);
      expect(result!.hasDrawnThisTurn).toBe(true);
      expect(result!.nextPlayer).toBe(0); // Player can still choose to play or pass, turn shouldn't advance yet
    });

    it("blocks drawing a card if the player has already drawn this turn", () => {
      const state = createTestState({ hasDrawnThisTurn: true });
      const result = oneLogic.update(state, { type: "draw" }, 0);
      expect(result).toBeNull();
    });

    it("allows a player to pass only after drawing a card", () => {
      const state = createTestState({ hasDrawnThisTurn: true, nextPlayer: 0 });
      const result = oneLogic.update(state, { type: "pass" }, 0);

      expect(result).not.toBeNull();
      expect(result!.nextPlayer).toBe(1); // Turn moves forward to player 1
      expect(result!.hasDrawnThisTurn).toBe(false); // Flag resets
    });

    it("blocks passing if a player has not drawn a card yet this turn", () => {
      const state = createTestState({ hasDrawnThisTurn: false });
      const result = oneLogic.update(state, { type: "pass" }, 0);
      expect(result).toBeNull();
    });

    it("successfully recycles the discard pile into the deck when the draw deck runs dry", () => {
      const state = createTestState({
        deck: [], // Deck is completely empty
        discardPile: [
          { id: "old-c1", color: "red", value: "1" },
          { id: "old-c2", color: "red", value: "3" },
          { id: "active-top", color: "red", value: "7" }, // Current active top car
        ],
        playerHands: [[{ id: "p0-c1" } as Card], [{ id: "p1-c1" } as Card]],
        nextPlayer: 0,
        hasDrawnThisTurn: false,
      });

      const result = oneLogic.update(state, { type: "draw" }, 0);

      expect(result).not.toBeNull();

      // The card must be preserved as the card left in the discard pile
      expect(result!.discardPile).toHaveLength(1);
      expect(result!.discardPile[0].id).toBe("active-top");

      // The remaining cards ('old-c1', 'old-c2') should be recycled into the deck
      // Since Player 0 immediately draws one of them, 1 card should be left in the deck pool
      expect(result!.deck).toHaveLength(1);

      // Player 0 gets a card, meaning their hand size grows from 1 to 2
      expect(result!.playerHands[0]).toHaveLength(2);
      expect(result!.hasDrawnThisTurn).toBe(true);
    });

    it("returns null when the deck is empty and the discard pile does not have enough cards to recycle", () => {
      const state = createTestState({
        deck: [], // Empty deck
        discardPile: [{ id: "active-top", color: "red", value: "7" }], // Only 1 card in discard pile
        playerHands: [[{ id: "p0-c1" } as Card]],
        nextPlayer: 0,
        hasDrawnThisTurn: false,
      });

      const result = oneLogic.update(state, { type: "draw" }, 0);

      // Should return null because there are no physical cards left in the match to draw
      expect(result).toBeNull();
    });
  });

  describe("update() - Card Matches & Action Modifiers", () => {
    it("allows matching by color context successfully", () => {
      const state = createTestState();
      const result = oneLogic.update(state, { type: "play", cardId: "p0-c1" }, 0);

      expect(result).not.toBeNull();
      expect(result!.discardPile[result!.discardPile.length - 1].id).toBe("p0-c1");
      expect(result!.nextPlayer).toBe(1);
    });

    it("allows matching numeric value criteria regardless of color mismatch", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "red", value: "2" }],
        activeColor: "red",
      });
      // Player 0 has 'p0-c1' which is a RED 2, Player 1 has a BLUE 2. Player 1's turn
      const stateForP1 = { ...state, nextPlayer: 1 };

      const result = oneLogic.update(stateForP1, { type: "play", cardId: "p1-c1" }, 1);
      expect(result).not.toBeNull();
      expect(result!.activeColor).toBe("blue"); // Color context shifts to match played card
    });

    it("blocks play action if card criteria conditions are mismatched completely", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "yellow", value: "9" }],
        activeColor: "yellow",
      }); // Player 0 hand contains red 2 and blue skip, no match

      const result = oneLogic.update(state, { type: "play", cardId: "p0-c1" }, 0);
      expect(result).toBeNull();
    });

    it("skips the next player actions if a skip modifier is deployed", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "blue", value: "3" }],
        activeColor: "blue",
      }); // Player 0 plays blue skip card

      const result = oneLogic.update(state, { type: "play", cardId: "p0-skip" }, 0);
      expect(result).not.toBeNull();
      expect(result!.nextPlayer).toBe(2); // Skipped player 1, advanced straight to player 2
    });

    it("reverses the rotation array indexing path direction entirely when a reverse card is introduced", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "blue", value: "3" }],
        activeColor: "blue",
        playerHands: [
          [{ id: "rev", color: "blue", value: "reverse" }], // P0
          [{ id: "c" } as Card], // P1
          [{ id: "c" } as Card], // P2
        ],
      });

      const result = oneLogic.update(state, { type: "play", cardId: "rev" }, 0);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe(-1);
      expect(result!.nextPlayer).toBe(2); // Clockwise (0 -> 1) inverted to Counter-Clockwise (0 -> 2)
    });

    it("forces a reverse modifier card to behave like a standard skip action when exactly 2 players are registered", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "blue", value: "3" }],
        activeColor: "blue",
        playerHands: [
          [{ id: "rev", color: "blue", value: "reverse" }], // P0
          [{ id: "c" } as Card], // P1
        ], // Exactly 2 players
      });

      const result = oneLogic.update(state, { type: "play", cardId: "rev" }, 0);
      expect(result).not.toBeNull();
      expect(result!.nextPlayer).toBe(0); // Player 1 was skipped, turn circles back to Player 0
    });

    it("forces next player to draw 2 cards and skips their turn when draw2 is processed", () => {
      const state = createTestState({
        discardPile: [{ id: "top", color: "blue", value: "3" }],
        activeColor: "blue",
        playerHands: [
          [{ id: "d2", color: "blue", value: "draw2" }],
          [{ id: "p1-c1" } as Card],
          [{ id: "p2-c1" } as Card],
        ],
      });

      const result = oneLogic.update(state, { type: "play", cardId: "d2" }, 0);
      expect(result).not.toBeNull();
      expect(result!.playerHands[1]).toHaveLength(3); // Player 1 took the +2 cards
      expect(result!.nextPlayer).toBe(2); // Player 1's choice action was skipped completely
    });

    it("demands a chosen color value assignment string when a wild card is played", () => {
      const state = createTestState({
        //deck needs at least 4 cards in this test case
        deck: [
          { id: "d1" } as Card,
          { id: "d2" } as Card,
          { id: "d3" } as Card,
          { id: "d4" } as Card,
        ],
        playerHands: [
          [{ id: "w4", color: "wild", value: "wildDraw4" }],
          [{ id: "p1-c1" } as Card],
          [{ id: "p2-c1" } as Card],
        ],
      });

      // Attempt playing without specifying a color choice
      const failResult = oneLogic.update(state, { type: "play", cardId: "w4" }, 0);
      expect(failResult).toBeNull();

      // Submit correctly with explicit color specification
      const successResult = oneLogic.update(
        state,
        { type: "play", cardId: "w4", chosenColor: "green" },
        0,
      );
      expect(successResult).not.toBeNull();
      expect(successResult!.activeColor).toBe("green");
      expect(successResult!.playerHands[1]).toHaveLength(5); // Player 1 takes 4 cards
      expect(successResult!.nextPlayer).toBe(2); // Skip step triggered
    });
  });

  describe("isDone()", () => {
    it("returns false if all active participant arrays hold cards", () => {
      const state = createTestState();
      expect(oneLogic.isDone(state)).toBe(false);
    });

    it("returns true immediately if any player hand length hits zero", () => {
      const state = createTestState({
        playerHands: [
          [], // Player 0 won
          [{ id: "card" } as Card],
        ],
      });
      expect(oneLogic.isDone(state)).toBe(true);
    });
  });

  describe("viewAs() and tagView() tests", () => {
    it("hides other player hands and strips down sensitive fields for a valid active player index", () => {
      const state = createTestState({
        deck: [{ id: "d1" } as Card, { id: "d2" } as Card], // deckCount = 2
        activeColor: "blue",
        nextPlayer: 1,
        direction: -1,
        hasDrawnThisTurn: true,
      });

      // Project the view specifically for Player 0
      const view = oneLogic.viewAs(state, 0);

      expect(view).toStrictEqual({
        discardTop: { id: "top", color: "red", value: "7" },
        activeColor: "blue",
        nextPlayer: 1,
        direction: -1,
        yourHand: [
          { id: "p0-c1", color: "red", value: "2" },
          { id: "p0-skip", color: "blue", value: "skip" },
        ], // Exactly Player 0's cards
        playerHandIds: [["p0-c1", "p0-skip"], ["p1-c1"], ["p2-c1"]], // Tracks how many cards everyone has remaining
        deckCount: 2,
        hasDrawnThisTurn: true,
        lastTurnActions: [],
      });
    });

    it("returns an empty hand array if the viewing entity is a spectator or has an invalid index", () => {
      const state = createTestState();

      // Pass an out-of-bounds index (e.g., an unseated room observer or supervisor)
      const spectatorView = oneLogic.viewAs(state, -1);

      expect(spectatorView.yourHand).toHaveLength(0); // Spectators can't see any private card sets
      expect(spectatorView.deckCount).toBe(2); // Can still verify public metrics
      // We don't care about actual card IDs, only the counts
      expect(spectatorView.playerHandIds.map((h) => h.length)).toStrictEqual([2, 1, 1]);
    });

    it("correctly encapsulates the inner structural data layout using tagView formatting templates", () => {
      const mockViewPayload: OneView = {
        discardTop: { id: "top" } as Card,
        activeColor: "green" as const,
        nextPlayer: 2,
        direction: 1 as const,
        yourHand: [],
        playerHandIds: [[]],
        deckCount: 52,
        hasDrawnThisTurn: false,
        lastTurnActions: [],
      };

      const tagged = oneLogic.tagView(mockViewPayload);

      // Ensures the discriminated union routing string wrapper matches client component parsing
      expect(tagged).toStrictEqual({
        type: "one",
        view: mockViewPayload,
      });
    });
  });
});

import { GameService } from "./gameServiceManager.ts";
import { type GameLogic } from "./gameLogic.ts";
import { generateBotMove } from "../bots/oneBot.ts";
import { gamePlayerLimits } from "@gamenite/shared";
import {
  type OneState,
  type OneView,
  zOneMove,
  type Card,
  type CardColor,
  type CardValue,
  type OneAction,
} from "../../../shared/src/games/one.types.ts";

/**
 * Game Logic for a Game of One (Uno)
 */
export const oneLogic: GameLogic<OneState, OneView> = {
  minPlayers: gamePlayerLimits.one.min,
  maxPlayers: gamePlayerLimits.one.max,

  start: (numPlayers) => {
    const deck = shuffle(generateDeck());

    // Deal 7 cards to each player
    const playerHands: Card[][] = [];
    for (let i = 0; i < numPlayers; i++) {
      playerHands.push(deck.splice(0, 7));
    }

    // Initialize discard pile with a non-wild top card to keep startup simple
    let firstCardIdx = deck.findIndex((card) => card.color !== "wild");
    if (firstCardIdx === -1) firstCardIdx = 0; // Fallback safeguard
    const [firstCard] = deck.splice(firstCardIdx, 1);
    const discardPile = [firstCard];

    return {
      deck,
      discardPile,
      playerHands,
      nextPlayer: 0,
      direction: 1,
      activeColor: firstCard.color,
      hasDrawnThisTurn: false,
      lastTurnActions: [],
    };
  },

  update: (state, payload, playerIndex) => {
    const parsedMove = zOneMove.safeParse(payload);

    // Validate turn
    if (playerIndex !== state.nextPlayer) return null;
    if (!parsedMove.success) return null;

    const move = parsedMove.data;
    const { deck, discardPile, playerHands, direction, activeColor, hasDrawnThisTurn } = state;
    const currentHand = playerHands[playerIndex];
    const topCard = discardPile[discardPile.length - 1];

    // Helper to advance the turn tracking standard play, skip, or reversals
    const advanceTurn = (currentState: OneState, steps = 1): number => {
      const numPlayers = currentState.playerHands.length;
      return (currentState.nextPlayer + steps * currentState.direction + numPlayers) % numPlayers;
    };

    // draw a card
    if (move.type === "draw") {
      if (hasDrawnThisTurn) return null; // Can only draw once per turn

      let currentDeck = [...deck];
      let currentDiscard = [...discardPile];

      // If deck is empty, recycle discard pile (preserving the current top card)
      if (currentDeck.length === 0) {
        if (currentDiscard.length <= 1) return null;
        const newTop = currentDiscard.pop()!;
        currentDeck = shuffle(currentDiscard);
        currentDiscard = [newTop];
      }

      const [drawnCard, ...remainingDeck] = currentDeck;
      const updatedHands = playerHands.map((hand, idx) =>
        idx === playerIndex ? [...hand, drawnCard] : hand,
      );

      return {
        ...state,
        deck: remainingDeck,
        discardPile: currentDiscard,
        playerHands: updatedHands,
        hasDrawnThisTurn: true, // Mark that they've drawn.. can now play that card or pass
        lastTurnActions: [
          {
            type: "draw",
            userIndex: playerIndex,
            amount: 1,
            cardIds: [drawnCard.id],
          },
        ],
      };
    }

    // pass turn after draw
    if (move.type === "pass") {
      // You can only pass if you have already drawn a card this turn
      if (!hasDrawnThisTurn) return null;

      return {
        ...state,
        nextPlayer: advanceTurn(state, 1),
        hasDrawnThisTurn: false,
        lastTurnActions: [],
      };
    }

    // play a card
    if (move.type === "play") {
      let currentDiscard = [...discardPile];

      const actions: OneAction[] = [
        {
          type: "play",
          userIndex: playerIndex,
          card: currentHand.find((c) => c.id === move.cardId)!,
        },
      ];

      const cardToPlay = currentHand.find((c) => c.id === move.cardId);
      if (!cardToPlay) return null;

      // checking card type
      const isMatch =
        cardToPlay.color === "wild" ||
        cardToPlay.color === activeColor ||
        cardToPlay.value === topCard.value;
      if (!isMatch) return null;

      // wilds need a chosen color
      if (cardToPlay.color === "wild" && !move.chosenColor) return null;

      // Update the playing player's hand
      const updatedHands = playerHands.map((hand, idx) =>
        idx === playerIndex ? hand.filter((c) => c.id !== cardToPlay.id) : hand,
      );

      // Determine next color context
      const nextActiveColor = cardToPlay.color === "wild" ? move.chosenColor! : cardToPlay.color;

      // Copy values for modifiers
      let nextDirection = direction;
      let nextStep = 1;
      let cardsToDrawNext = 0;

      //  special action card
      if (cardToPlay.value === "reverse") {
        // In 2 player games, reverse behaves like a skip
        if (playerHands.length === 2) {
          nextStep = 2;
          // just reverse order otherwise
        } else {
          nextDirection = direction === 1 ? -1 : 1;
        }
      } else if (cardToPlay.value === "skip") {
        nextStep = 2;
      } else if (cardToPlay.value === "draw2") {
        cardsToDrawNext = 2;
        nextStep = 2; // Skip the next player's action
      } else if (cardToPlay.value === "wildDraw4") {
        cardsToDrawNext = 4;
        nextStep = 2; // Skip the next player's action
      }

      // intermediate state for next turn
      const partialState: OneState = {
        ...state,
        direction: nextDirection,
        nextPlayer: state.nextPlayer, // Temporary placeholder
      };

      const nextPlayerTarget = advanceTurn(partialState, nextStep);
      let updatedDeck = [...deck];

      // Execute stacked draws if action penalty is activated
      if (cardsToDrawNext > 0) {
        // Check deck pool size & recycle if needed before applying penalty
        if (updatedDeck.length < cardsToDrawNext) {
          const recycled = shuffle(currentDiscard);
          updatedDeck = [...updatedDeck, ...recycled];
          currentDiscard = [];
        }

        const drawn = updatedDeck.splice(0, cardsToDrawNext);
        updatedHands[advanceTurn(partialState, 1)] = [
          ...updatedHands[advanceTurn(partialState, 1)],
          ...drawn,
        ];

        actions.push({
          type: "draw",
          amount: cardsToDrawNext,
          cardIds: drawn.map((c) => c.id),
          userIndex: advanceTurn(partialState, 1),
        });
      }

      return {
        deck: updatedDeck,
        discardPile: [...currentDiscard, cardToPlay],
        playerHands: updatedHands,
        nextPlayer: nextPlayerTarget,
        direction: nextDirection,
        activeColor: nextActiveColor,
        hasDrawnThisTurn: false,
        lastTurnActions: actions,
      };
    }

    return null;
  },

  isDone: ({ playerHands }) => {
    // Game ends immediately when any player runs out of cards
    return playerHands.some((hand) => hand.length === 0);
  },

  viewAs: (state, playerIndex) => {
    const topCard = state.discardPile[state.discardPile.length - 1];
    const targetHand =
      playerIndex >= 0 && playerIndex < state.playerHands.length
        ? state.playerHands[playerIndex]
        : [];

    return {
      discardTop: topCard,
      activeColor: state.activeColor,
      nextPlayer: state.nextPlayer,
      direction: state.direction,
      yourHand: targetHand,
      playerHandIds: state.playerHands.map((hand) => hand.map((c) => c.id)),
      deckCount: state.deck.length,
      hasDrawnThisTurn: state.hasDrawnThisTurn,
      lastTurnActions: state.lastTurnActions,
    };
  },

  tagView: (view) => ({ type: "one", view }),
};

export const oneGameService = new GameService<OneState, OneView>(oneLogic);

oneGameService.generateBotMove = (state: OneState, playerIndex: number) => {
  return generateBotMove(state, playerIndex);
};

//Helpers:)

// Generates a standard deck of 108 cards with unique IDs
function generateDeck(): Card[] {
  const colors: Exclude<CardColor, "wild">[] = ["red", "blue", "green", "yellow"];
  const values: CardValue[] = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw2",
  ];
  const deck: Card[] = [];
  let idCounter = 0;

  const nextId = () => `card_${idCounter++}`;

  for (const color of colors) {
    // One '0' card per color
    deck.push({ id: nextId(), color, value: "0" });

    // Two of every other number and action card per color
    for (const value of values) {
      deck.push({ id: nextId(), color, value });
      deck.push({ id: nextId(), color, value });
    }
  }

  // Four of each wild card type
  for (let i = 0; i < 4; i++) {
    deck.push({ id: nextId(), color: "wild", value: "wild" });
    deck.push({ id: nextId(), color: "wild", value: "wildDraw4" });
  }

  return deck;
}

// Pure array shuffler
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

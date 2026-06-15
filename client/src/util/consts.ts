import type { GameKey } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
  one: "One",
};

export type GameInstructionsType = (string | GameInstructionsType)[];

export const gameInstructions: { [key in GameKey]: GameInstructionsType } = {
  nim: [
    "The game starts with a pile of objects.",
    "Players take turns removing objects from the pile.",
    "On their turn, a player must remove 1, 2, or 3 objects from the pile.",
    "The player who removes the last object loses the game.",
    "Think strategically and try to force your opponent into a losing position!",
  ],
  guess: ["In the guessing game, players guess a number between 1 and 100. The closest wins!"],
  one: [
    "Each player starts with 7 cards.",
    "On your turn, you may play a card, or draw a card.",
    [
      "To play a card, it must match the color or number of the top card on the discard pile.",
      "Wild cards can be played on any card, and allow you to change the active color.",
      "After drawing a card, you may then either play a card or may skip.",
      "Special cards have the following effects:",
      [
        "Skip: next player is skipped",
        "Reverse: order of play is reversed",
        "Draw 2: next player draws 2 cards and is skipped",
        "Wild: player declares the next color to match",
        "Wild Draw 4: player declares the next color to match, and next player draws 4 cards and is skipped",
      ],
    ],
    "The first player to get rid of all their cards wins!",
  ],
};

export const WEBSITE_NAME = "LazyNite";

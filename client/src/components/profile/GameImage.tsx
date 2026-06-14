import type { GameKey } from "@gamenite/shared";
import { gameNames } from "../../util/consts";
import Nim from "../../assets/nim.png";
import One from "../../assets/one.png";
import Guess from "../../assets/numberguesser.png";

/**
 * Shows the image for a game type.
 * @param game the game key used to choose the image
 * @returns the game image, otherwise nothing if there is no matching image
 */
export default function GameImage({ game }: { game: GameKey }) {
  //stores image for the given game
  let gameSrc: string;

  switch (game) {
    case "guess":
      gameSrc = Guess;
      break;
    case "nim":
      gameSrc = Nim;
      break;
    case "one":
      gameSrc = One;
      break;
    default:
      return null;
  }
  // shows selected game image
  return <img src={gameSrc} alt={`${gameNames[game]} Game`} className="game-image" />;
}

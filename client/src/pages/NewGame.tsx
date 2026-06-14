import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import type { GameKey } from "@gamenite/shared";
import Nim from "../assets/nim.png";
import One from "../assets/one.png";
import Guess from "../assets/numberguesser.png";
import "./NewGame.css";

/**
 * Page where a user can choose a game card to create a new game
 * @returns the UI for creating a new game
 */
export default function NewGame() {
  //gets friend only setting, error, and game creation
  const { friendOnly, toggleFriendOnly, err, handleGameClick } = useNewGameForm();

  return (
    <div className="content spacedSection newGamePage">
      <h2>Create new game</h2>
      {/* If the user has the game public or private */}
      <div className="newGameToggleRow">
        <span>Friends only</span>
        <button
          type="button"
          role="switch"
          aria-label="Friends only"
          aria-checked={friendOnly}
          onClick={toggleFriendOnly}
          className={`friendOnlySwitch ${friendOnly ? "friendOnlySwitchOn" : ""}`}
        >
          <span className="friendOnlySwitchKnob" />
        </button>
        <span className="smallAndGray">
          {friendOnly ? "Only your friends can join" : "Anyone can join"}
        </span>
      </div>
      {/* Displays each game as a clickable card */}
      <div className="newGameList">
        <h3>Choose a Game</h3>
        {/* Creates 1 game as a card for every game key */}
        {Object.entries(gameNames).map(([key, name]) => (
          <button
            key={key}
            type="button"
            className="newGameEntry"
            onClick={() => handleGameClick(key as GameKey)}
          >
            <GameImage game={key as GameKey} />
            <span className="newGameType">{name}</span>
            <span className="newGameAction">Start game</span>
          </button>
        ))}
      </div>

      {err && <p className="error-message">{err}</p>}
    </div>
  );
}

/**
 * Shows the matching image for a game card
 * @param game the game key used to choose which image to display
 * @returns
 */
function GameImage({ game }: { game: GameKey }) {
  let gameSrc: string;

  //chooses correct image based on selected game key
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
      //use first letter of game name if there is no image for it
      return <span className="newGameFallbackIcon">{gameNames[game][0]}</span>;
  }

  return <img src={gameSrc} alt={`${gameNames[game]} Game`} className="newGameImage" />;
}

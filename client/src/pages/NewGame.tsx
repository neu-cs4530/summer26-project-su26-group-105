import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import type { GameKey } from "@gamenite/shared";
import { gameSupportsPlayerCount } from "@gamenite/shared";
import Nim from "../assets/nim.png";
import One from "../assets/one.png";
import Guess from "../assets/numberguesser.png";
import "./NewGame.css";

/**
 * Page where a user can choose a game card to create a new game or tournament.
 * @param tournament - when true, the page creates a tournament; otherwise a
 *   single game
 * @returns the UI for creating a new game
 */
export default function NewGame({ tournament: isTournament = false }: { tournament?: boolean }) {
  //gets friend only setting, tournament settings, error, and game creation
  const {
    friendOnly,
    gameSize,
    bracketSize,
    bracketOptions,
    err,
    toggleFriendOnly,
    setGameSize,
    setBracketSize,
    handleGameClick,
  } = useNewGameForm(isTournament);

  return (
    <div className="content spacedSection newGamePage">
      <h2>{isTournament ? "Create new tournament" : "Create new game"}</h2>
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
      {/* Tournament-only settings */}
      {isTournament && (
        <div className="tournamentSettings">
          <label className="tournamentSetting">
            <span>Players per match</span>
            <input
              type="number"
              min={2}
              value={gameSize}
              onChange={(e) => setGameSize(Math.max(2, Number(e.target.value) || 2))}
            />
          </label>
          <label className="tournamentSetting">
            <span>Bracket size</span>
            <select value={bracketSize} onChange={(e) => setBracketSize(Number(e.target.value))}>
              {bracketOptions.map((size) => (
                <option key={size} value={size}>
                  {size} players
                </option>
              ))}
            </select>
          </label>
          <span className="smallAndGray">
            Bracket sizes must be a power of the match size so the bracket reduces to one winner.
          </span>
        </div>
      )}
      {/* Displays each game as a clickable card. In tournament mode, only games
          that can be played with the chosen match size are shown */}
      <div className="newGameList">
        <h3>{isTournament ? "Choose a Game to host" : "Choose a Game"}</h3>
        {/* Creates 1 game as a card for every game key */}
        {Object.entries(gameNames)
          .filter(([key]) => !isTournament || gameSupportsPlayerCount(key as GameKey, gameSize))
          .map(([key, name]) => (
            <button
              key={key}
              type="button"
              className="newGameEntry"
              onClick={() => handleGameClick(key as GameKey)}
            >
              <GameImage game={key as GameKey} />
              <span className="newGameType">{name}</span>
              <span className="newGameAction">
                {isTournament ? "Host tournament" : "Start game"}
              </span>
            </button>
          ))}
        {isTournament &&
          Object.keys(gameNames).filter((key) => gameSupportsPlayerCount(key as GameKey, gameSize))
            .length === 0 && (
            <p className="smallAndGray">
              No games support {gameSize} players per match. Try a different match size.
            </p>
          )}
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

import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { gameInstructions, gameNames, type GameInstructionsType } from "../util/consts.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import DisplayName from "./DisplayName.tsx";
import { useState } from "react";

/**
 * A game panel allows viewing the status and players of a live game
 */
export default function GamePanel({
  gameId,
  type,
  players: initialPlayers,
  createdAt,
  minPlayers,
  maxPlayers,
}: GameInfo) {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();

  const [showPlayers, setShowPlayers] = useState(false);

  const { view, players, userPlayerIndex, hasWatched, joinGame, startGame, addBot } =
    useSocketsForGame(gameId, initialPlayers);

  const gameSupportsBots = type === "one";

  return hasWatched ? (
    <div className="gamePanel">
      <div className="gameRoster">
        <h2>{gameNames[type]}</h2>
        <div className="smallAndGray">Game room created {timeSince(createdAt)}</div>
        {(!view || showPlayers) && (
          <div className="dottedList">
            {players.map((player, index) => (
              <div
                className="dottedListItem"
                role="listitem"
                key={player.username}
                style={{ gap: "1ch", alignItems: "center" }}
              >
                {player.username === user.username ? (
                  `you are player #${index + 1}`
                ) : (
                  <>
                    Player #{index + 1} is <DisplayName user={player} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="buttons">
          {
            // If the game hasn't started and user hasn't joined, they can join
            userPlayerIndex < 0 && !view && (
              <button className="primary narrow" onClick={joinGame}>
                Join Game
              </button>
            )
          }
          {
            // If the game supports bots and the user created the game, allow adding bots
            gameSupportsBots &&
              userPlayerIndex === 0 &&
              players.length < Number(maxPlayers) &&
              !view && (
                <button type="button" className="primary narrow" onClick={addBot}>
                  Add Bot
                </button>
              )
          }
          {
            // If the game hasn't started and the user has joined, they can start the game if a minimum number of players are present
            userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
              <button className="primary narrow" onClick={startGame}>
                Start Game
              </button>
            )
          }
          {view && (
            <button
              className={`narrow ${showPlayers ? "cancel" : "primary"}`}
              onClick={() => setShowPlayers((s) => !s)}
            >
              {showPlayers ? "Hide" : "Show"} Players
            </button>
          )}
        </div>
      </div>
      {view ? (
        <div className="gameFrame">
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <div className="gameFrame waiting content">
          <h2>How to Play</h2>
          <GameInstructions instructions={gameInstructions[type]} />
          <span className="waiting-text">waiting for game to begin</span>
        </div>
      )}
    </div>
  ) : (
    <div></div>
  );
}

function GameInstructions({ instructions }: { instructions: GameInstructionsType }) {
  return (
    <ul className="instructions">
      {instructions.map((item, index) => (
        <li key={index}>
          {typeof item === "string" ? (
            <>
              <span>{item}</span>
              <hr />
            </>
          ) : (
            <GameInstructions instructions={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

import "./GameSummaryView.css";
import type { GameInfo } from "@gamenite/shared";
import { NavLink, useNavigate } from "react-router-dom";
import { gameNames } from "../util/consts.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import DisplayName from "./DisplayName.tsx";

// status of game
const statusConfig = {
  waiting: { label: "Waiting", className: "status-waiting" },
  active: { label: "In Progress", className: "status-active" },
  done: { label: "Finished", className: "status-done" },
};

// game icons
const gameIcons: Record<string, string> = {
  nim: "🪨",
  guess: "🔢",
  one: "🃏",
};

/**
 * Summarizes information for a single game as part of a list of games
 * Displays game type, status, player count, creator, time, and friend-only badge.
 */
export default function GameSummaryView({
  gameId,
  status,
  type,
  players,
  createdAt,
  createdBy,
  friendOnly,
}: GameInfo) {
  const timeSince = useTimeSince();
  const navigate = useNavigate();
  const numPlayers = players.length;
  const { label, className } = statusConfig[status];

  return (
    <div className="gameSummary" role="listitem" onClick={() => navigate(`/game/${gameId}`)}>
      {/* Game icon */}
      <div className="gameIcon" aria-hidden>
        {gameIcons[type] ?? "🎮"}
      </div>

      {/* Main info: title + meta */}
      <div className="gameMain">
        <div className="gameTitle">
          <NavLink to={`/game/${gameId}`} onClick={(e) => e.stopPropagation()}>
            A game of {gameNames[type]}
          </NavLink>
        </div>
        <div className="gameMeta">
          <DisplayName user={createdBy} /> · {timeSince(createdAt)}
        </div>
      </div>

      {/* Friends only badge */}
      {friendOnly && (
        <span className="friendOnlyBadge" title="Friends only">
          🔒 Friends Only
        </span>
      )}

      {/* Right side: status pill + player count */}
      <div className="gameRight">
        <span className={`gameStatus ${className}`}>{label}</span>
        {status !== "done" && (
          <span className="playerCount">
            👤 {numPlayers} player{numPlayers === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

import "./GameSummaryView.css";
import type { TournamentInfo } from "@gamenite/shared";
import { NavLink, useNavigate } from "react-router-dom";
import { gameNames } from "../util/consts.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import DisplayName from "./DisplayName.tsx";

// labels for each tournament status
const statusConfig = {
  registering: { label: "Registering", className: "status-waiting" },
  active: { label: "In Progress", className: "status-active" },
  done: { label: "Finished", className: "status-done" },
};

/**
 * Summarizes a single tournament as part of a list
 * Displays the game type, status, registration progress, creator, and a friends-only badge
 */
export default function TournamentSummaryView({
  tournamentId,
  type,
  status,
  participants,
  bracketSize,
  createdAt,
  createdBy,
  friendOnly,
}: TournamentInfo) {
  const timeSince = useTimeSince();
  const navigate = useNavigate();
  const { label, className } = statusConfig[status];

  return (
    <div
      className="gameSummary"
      role="listitem"
      onClick={() => navigate(`/tournament/${tournamentId}`)}
    >
      <div className="gameIcon" aria-hidden>
        🏆
      </div>

      <div className="gameMain">
        <div className="gameTitle">
          <NavLink to={`/tournament/${tournamentId}`} onClick={(e) => e.stopPropagation()}>
            {gameNames[type]} Tournament
          </NavLink>
        </div>
        <div className="gameMeta">
          <span onClick={(e) => e.stopPropagation()}>
            <DisplayName user={createdBy} />
          </span>
          {" · "}
          {timeSince(createdAt)}
        </div>
      </div>

      {friendOnly && (
        <span className="friendOnlyBadge" title="Friends only">
          🔒 Friends Only
        </span>
      )}

      <div className="gameRight">
        <span className={`gameStatus ${className}`}>{label}</span>
        {status === "registering" && (
          <span className="playerCount">
            👤 {participants.length}/{bracketSize}
          </span>
        )}
      </div>
    </div>
  );
}

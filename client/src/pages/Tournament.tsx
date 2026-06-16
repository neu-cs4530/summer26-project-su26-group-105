import { useParams, useNavigate } from "react-router-dom";
import type { GameInfo } from "@gamenite/shared";
import useTournament from "../hooks/useTournament.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { gameNames } from "../util/consts.ts";
import DisplayName from "../components/DisplayName.tsx";
import "./Tournament.css";

/**
 * Page showing a tournament bracket of a game type. Players can register
 * while the tournament is in the registering state, and enter their current
 * match once the bracket fills and rounds begin.
 */
export default function Tournament() {
  const { tournamentId } = useParams();
  const { user } = useLoginContext();
  const navigate = useNavigate();
  const { tournament, error, join } = useTournament(tournamentId ?? "");

  if (error) return <div className="content spacedSection">Error: {error}</div>;
  if (!tournament) return <div className="content spacedSection">Loading...</div>;

  const isParticipant = tournament.participants.some((p) => p.username === user.username);
  const isFull = tournament.participants.length >= tournament.bracketSize;

  // the player's match in the current round that hasn't finished yet
  const currentRound = tournament.rounds[tournament.rounds.length - 1] ?? [];
  const myActiveMatch = currentRound.find(
    (match) => match.status !== "done" && match.players.some((p) => p.username === user.username),
  );

  return (
    <div className="content spacedSection tournamentPage">
      <h2>{gameNames[tournament.type]} Tournament</h2>
      <p className="smallAndGray">
        {tournament.gameSize} players per match · bracket of {tournament.bracketSize}
        {tournament.friendOnly ? " · 🔒 Friends only" : ""}
      </p>

      {tournament.status === "registering" && (
        <section className="tournamentSection">
          <h3>
            Registration ({tournament.participants.length}/{tournament.bracketSize})
          </h3>
          <ul className="tournamentParticipants">
            {tournament.participants.map((p) => (
              <li key={p.username}>
                <DisplayName user={p} />
              </li>
            ))}
          </ul>
          {!isParticipant && !isFull && (
            <button type="button" className="primary-button" onClick={join}>
              Register
            </button>
          )}
          {isParticipant && (
            <p className="smallAndGray">You&apos;re registered. Waiting for the bracket to fill…</p>
          )}
        </section>
      )}

      {tournament.status !== "registering" && (
        <section className="tournamentSection">
          {myActiveMatch && (
            <button
              type="button"
              className="primary-button tournamentEnterMatch"
              onClick={() => navigate(`/game/${myActiveMatch.gameId}`)}
            >
              Enter your match
            </button>
          )}
          {!myActiveMatch && tournament.status === "active" && (
            <p className="smallAndGray">
              {isParticipant
                ? "You have no active match right now — waiting for the next round."
                : "Spectating this tournament."}
            </p>
          )}

          <div className="tournamentBracket">
            {tournament.rounds.map((round, i) => (
              <div key={i} className="tournamentRound">
                <h4>{roundTitle(i, tournament.rounds.length, tournament.status)}</h4>
                {round.map((match) => (
                  <MatchCard
                    key={match.gameId}
                    match={match}
                    onClick={() => navigate(`/game/${match.gameId}`)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tournament.status === "done" && tournament.champion && (
        <section className="tournamentSection tournamentChampion">
          <h3>🏆 Champion</h3>
          <DisplayName user={tournament.champion} />
        </section>
      )}
    </div>
  );
}

function roundTitle(index: number, totalRounds: number, status: string): string {
  // the final round is only known to be the final once it exists
  const isFinal = status === "done" && index === totalRounds - 1;
  if (isFinal) return "Final";
  return `Round ${index + 1}`;
}

/** A single match within a round */
function MatchCard({ match, onClick }: { match: GameInfo; onClick: () => void }) {
  return (
    <button type="button" className="tournamentMatch" onClick={onClick}>
      <div className="tournamentMatchPlayers">
        {match.players.map((p) => (
          <span
            key={p.username}
            className={match.winnerUser?.username === p.username ? "tournamentMatchWinner" : ""}
          >
            <DisplayName user={p} />
          </span>
        ))}
      </div>
      <span className="tournamentMatchStatus">
        {match.status === "done"
          ? "✓ Finished"
          : match.status === "active"
            ? "In progress"
            : "Waiting"}
      </span>
    </button>
  );
}

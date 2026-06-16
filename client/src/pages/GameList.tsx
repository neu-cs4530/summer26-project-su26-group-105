import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import TournamentSummaryView from "../components/TournamentSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import useTournamentList from "../hooks/useTournamentList.ts";

export default function GameList() {
  const gameList = useGameList();
  const tournaments = useTournamentList();
  const navigate = useNavigate();

  // Tracks which tab the user has open currently
  const [activeTab, setActiveTab] = useState<"games" | "tournaments">("games");

  return (
    <div className="content">
      {/* Tab buttons for games vs tournaments */}
      <div className="profile-tabs" style={{ marginBottom: "24px" }}>
        <button
          className={activeTab === "games" ? "active-tab" : ""}
          onClick={() => setActiveTab("games")}
        >
          All Games
        </button>
        <button
          className={activeTab === "tournaments" ? "active-tab" : ""}
          onClick={() => setActiveTab("tournaments")}
        >
          Tournaments
        </button>
      </div>

      {/* All games */}
      {activeTab === "games" && (
        <div className="spacedSection">
          <h2>All games</h2>
          <div>
            <button className="primary narrow" onClick={() => navigate("/game/new")}>
              Create New Game
            </button>
          </div>
          <>
            {"message" in gameList ? (
              gameList.message
            ) : (
              <div className="dottedList">
                {gameList.map((game) => (
                  <GameSummaryView {...game} key={game.gameId.toString()} />
                ))}
              </div>
            )}
          </>
        </div>
      )}

      {/* Tournaments */}
      {activeTab === "tournaments" && (
        <div className="spacedSection">
          <h2>Tournaments</h2>
          <div>
            <button className="primary narrow" onClick={() => navigate("/tournament/new")}>
              Create New Tournament
            </button>
          </div>
          <>
            {"message" in tournaments ? (
              tournaments.message
            ) : (
              <div className="dottedList">
                {tournaments.map((tournament) => (
                  <TournamentSummaryView {...tournament} key={tournament.tournamentId} />
                ))}
              </div>
            )}
          </>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import type { GameKey, LeaderboardPlayer } from "@gamenite/shared";
import { gameNames } from "../util/consts";
import LeaderboardTable from "../components/LeaderboardTable";
import { getLeaderboardList } from "../services/leaderboardService";
import useLoginContext from "../hooks/useLoginContext";

//leaderboard can either be global or for a specific game id
type LeaderboardFilter = "global" | GameKey;

export default function Leaderboard() {
  //keeps track of which leaderboard was selected
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardFilter>("global");
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardPlayer[]>([]);
  const { socket, user } = useLoginContext();

  let leaderboardTitle = "Global Leaderboard";

  //checks whether the selected leaderboard is game specific
  if (selectedLeaderboard !== "global") {
    leaderboardTitle = `${gameNames[selectedLeaderboard]} Leaderboard`;
  }

  useEffect(() => {
    // prevents setting state after this effect is cleaned up
    // false if request is current, true if it's old
    let ignore = false;

    //runs once immediately when the page loads or the selected leaderboard changes
    void getLeaderboardList(selectedLeaderboard) // gets leaderboard rows directly in the effect
      .then((rows) => {
        if (!ignore) {
          // only updates state if this effect is still current
          setLeaderboardRows(rows);
        }
      })
      .catch(() => {
        if (!ignore) {
          // only clears rows if this effect is still current
          setLeaderboardRows([]);
        }
      });

    return () => {
      // marks old request results as ignored when selectedLeaderboard changes
      ignore = true;
    };
  }, [selectedLeaderboard]); // refetches rows when the dropdown selection changes

  useEffect(() => {
    function handleLeaderboardUpdated(payload: { gameType: GameKey }) {
      // handles leaderboard update socket events
      if (selectedLeaderboard === "global" || selectedLeaderboard === payload.gameType) {
        // refetches the leaderboard when a matching game ends
        void getLeaderboardList(selectedLeaderboard)
          .then((rows) => {
            // updates the table with the newest leaderboard rows from the server
            setLeaderboardRows(rows);
          })
          .catch(() => {
            // clears the table if the leaderboard refetch fails
            setLeaderboardRows([]);
          });
      }
    }

    // listens for leaderboard updates from the server
    socket.on("leaderboardUpdated", handleLeaderboardUpdated);

    return () => {
      socket.off("leaderboardUpdated", handleLeaderboardUpdated);
    };
  }, [socket, selectedLeaderboard]);

  return (
    <div>
      <label htmlFor="leaderboardFilter">Choose Leaderboard</label>{" "}
      {/* adds a label for the leaderboard dropdown */}
      <select
        id="leaderboardFilter"
        value={selectedLeaderboard}
        onChange={(event) => setSelectedLeaderboard(event.target.value as LeaderboardFilter)}
      >
        <option value="global">Global</option>

        {/* creates dropdown for each game */}
        {Object.entries(gameNames).map(([gameKey, gameName]) => (
          <option key={gameKey} value={gameKey}>
            {gameName}
          </option>
        ))}
      </select>
      <LeaderboardTable
        title={leaderboardTitle}
        rows={leaderboardRows}
        currentUsername={user.username}
      />
    </div>
  );
}

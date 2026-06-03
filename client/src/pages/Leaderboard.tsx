import { useState, useEffect } from "react";
import type { GameKey, LeaderboardPlayer } from "@gamenite/shared";
import { gameNames } from "../util/consts";
import LeaderboardTable from "../components/LeaderboardTable";
import useAuth from "../hooks/useAuth";

//leaderboard can either be global or for a specific game id
type LeaderboardFilter = "global" | GameKey;

export default function Leaderboard() {
  //keeps track of which leaderboard was selected
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardFilter>("global");
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardPlayer[]>([]);
  const { username } = useAuth();

  let leaderboardTitle = "Global Leaderboard";

  //checks whether the selected leaderboard is game specific
  if (selectedLeaderboard !== "global") {
    leaderboardTitle = `${gameNames[selectedLeaderboard]} Leaderboard`;
  }

  useEffect(() => {
    // reloads leaderboard rows whenever the selected leaderboard changes
    async function loadLeaderboard() {
      // calls the backend route for the selected leaderboard
      const response = await fetch(`/api/leaderboard/list?type=${selectedLeaderboard}`);

      // handles a failed backend request
      if (!response.ok) {
        //clears rows
        setLeaderboardRows([]);
        return;
      }

      // reads the backend response as leaderboard rows and sets it
      const rows = (await response.json()) as LeaderboardPlayer[];
      setLeaderboardRows(rows);
    }

    //runs once immediately when the page loads or the selected leaderboard changes
    void loadLeaderboard();

    //refreshes leaderboard data every 5 minutes while this page is open
    const refreshPage = window.setInterval(
      () => {
        void loadLeaderboard();
      },
      5 * 60 * 1000,
    );
    return () => {
      window.clearInterval(refreshPage);
    };
  }, [selectedLeaderboard]); // refetches rows when the dropdown selection changes

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
        currentUsername={username}
      />
    </div>
  );
}

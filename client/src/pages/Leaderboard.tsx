import { useState } from "react";
import type { GameKey } from "@gamenite/shared";
import { gameNames } from "../util/consts";
import LeaderboardTable, { type LeaderboardPlayer } from "../components/LeaderboardTable";

type LeaderboardFilter = "global" | GameKey;

const GLOBAL_LEADERBOARD: LeaderboardPlayer[] = [
  {
    rank: 1,
    status: "Gold",
    profilePictureUrl: "",
    username: "test",
    winRate: 92,
  },
  {
    rank: 2,
    status: "Silver",
    profilePictureUrl: "",
    username: "test2",
    winRate: 84,
  },
];

//creates temporary Number Guesser and nim leaderboard rows
const gameLeaderboards: Record<GameKey, LeaderboardPlayer[]> = {
  nim: [
    {
      rank: 1,
      status: "Gold",
      profilePictureUrl: "",
      username: "nim player",
      winRate: 88,
    },
  ],
  guess: [
    {
      rank: 1,
      status: "Gold",
      profilePictureUrl: "",
      username: "guess player",
      winRate: 80,
    },
  ],
};

export default function Leaderboard() {
  //keeps track of which leaderboard was selected
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardFilter>("global");

  let leaderboardTitle = "Global Leaderboard";
  let leaderboardRows = GLOBAL_LEADERBOARD;

  //checks whether the selected leaderboard is game specific
  if (selectedLeaderboard !== "global") {
    leaderboardTitle = `${gameNames[selectedLeaderboard]} Leaderboard`;
    leaderboardRows = gameLeaderboards[selectedLeaderboard];
  }

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
      <LeaderboardTable title={leaderboardTitle} rows={leaderboardRows} />
    </div>
  );
}

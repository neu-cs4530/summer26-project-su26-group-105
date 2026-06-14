import DisplayName from "./DisplayName";
import "./LeaderboardTable.css";
import type { LeaderboardPlayer } from "@gamenite/shared";

//creates the type to pass in to the component as props
type LeaderboardTableProps = {
  title: string;
  rows: LeaderboardPlayer[];
  currentUsername: string;
};

/**
 * loads in the data for the leaderboard with the given title, rows, and username
 * @param title the title shown above the leaderboard table
 * @param rows the leaderboard rows to display
 * @param currentUsername the signed in user's username, used to show (you) next to their row
 * @returns
 */
export default function LeaderboardTable({ title, rows, currentUsername }: LeaderboardTableProps) {
  return (
    <div className="leaderboardContainer">
      <h1 className="leaderboardTitle">{title}</h1>

      {/* Creates the table for the leaderboard */}
      <table className="leaderboardTable">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Status</th>
            <th>User</th>
            <th>Points</th>
            <th>Total Games</th>
            <th>Total Wins</th>
            <th>Win Rate</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((player) => (
            <tr key={player.user.username}>
              <td>{player.rank}</td>
              <td>{player.status}</td>
              <td>
                <DisplayName user={player.user} showFullInfo />
                {player.user.username === currentUsername && " (you)"}
              </td>
              <td>{player.rankPoints}</td>
              <td>{player.totalGames}</td>
              <td>{player.totalWins}</td>
              <td>
                {player.totalGames === 0
                  ? "0%"
                  : `${Math.round((player.totalWins / player.totalGames) * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

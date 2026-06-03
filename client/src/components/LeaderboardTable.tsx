import "./LeaderboardTable.css";
import type { LeaderboardPlayer } from "@gamenite/shared";

//creates the type to pass in to the component as props
type LeaderboardTableProps = {
  title: string;
  rows: LeaderboardPlayer[];
  currentUsername: string;
};

/**
 * loads in the UI for the leaderboard with the given title, rows, and username
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
            <th>Profile Picture</th>
            <th>Username</th>
            <th>Total Games</th>
            <th>Total Wins</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((player) => (
            <tr key={player.username}>
              <td>{player.rank}</td>
              <td>{player.status}</td>
              <td>
                {player.profilePictureUrl && (
                  <img
                    className="leaderboardProfilePicture"
                    src={player.profilePictureUrl}
                    alt={`${player.username}'s profile`}
                  />
                )}
              </td>
              <td>
                {player.display}
                {player.username === currentUsername && " (you)"}
              </td>
              <td>{player.totalGames}</td>
              <td>{player.totalWins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

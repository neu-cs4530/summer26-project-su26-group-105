import "./LeaderboardTable.css";

//creates the type for each row in the leaderboard table
export type LeaderboardPlayer = {
  rank: number;
  status: string;
  profilePictureUrl: string;
  username: string;
  winRate: number;
};

//creates the type to pass in to the component as props
type LeaderboardTableProps = {
  title: string;
  rows: LeaderboardPlayer[];
};

//component that just loads in the UI for the leaderboard with the given title and rows
export default function LeaderboardTable({ title, rows }: LeaderboardTableProps) {
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
            <th>Win Rate</th>
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
              <td>{player.username}</td>
              <td>{player.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

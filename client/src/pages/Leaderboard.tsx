//creates the type for each row in the leaderboard table
type LeaderboardPlayer = {
  rank: number;
  status: string;
  profilePictureUrl: string;
  username: string;
  winRate: number;
};

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

export default function Leaderboard() {
  return (
    <div>
      <h1>Leaderboard</h1>

      {/* Creates the table for the leaderboard */}
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Status</th>
            <th>Profile Picture</th>
            <th>Username</th>
            <th>Win Rate</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}

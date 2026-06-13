import useProfileStats from "../../hooks/profile/useProfileStats";

type ProfileStatsProps = {
  username: string;
};

/**
 * Shows the profile stats card with game counts and leaderboard summary.
 * @param username the username of the profile being viewed
 * @returns the profile stats UI
 */
export default function ProfileStats({ username }: ProfileStatsProps) {
  //gets the user's leaderboard row, games, and bar width
  const { leaderboardPlayer, gameEntries, getGameBarWidth } = useProfileStats(username);

  return (
    <div className="profile-stats-card">
      <h3 className="profile-section-title">Games Played</h3>

      {/* shows the bar for each game */}
      <div className="game-bars">
        {gameEntries.map(([gameKey, gameName]) => {
          //gets how many times user has played this game
          const gameCount = leaderboardPlayer?.gameCounts[gameKey] ?? 0;

          return (
            <div className="game-bar-row" key={gameKey}>
              {/* shows game name on left and how many times played on the right */}
              <div className="game-bar-label">
                <span>{gameName}</span>
                <span>{gameCount}</span>
              </div>

              {/* fills the bar as a visual */}
              <div className="game-bar-track">
                <div className="game-bar-fill" style={{ width: getGameBarWidth(gameCount) }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* shows the summary stats only if the leaderboard row exists for this player */}
      {leaderboardPlayer && (
        <div className="profile-stat-summary">
          <span>Total Games: {leaderboardPlayer.totalGames}</span>
          <span>Total Wins: {leaderboardPlayer.totalWins}</span>
          <span>Points: {leaderboardPlayer.rankPoints}</span>
          <span>Rank: #{leaderboardPlayer.rank}</span>
        </div>
      )}
    </div>
  );
}

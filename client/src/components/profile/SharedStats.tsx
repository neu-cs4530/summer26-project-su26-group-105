import "./SharedStats.css";
import useFriendStats from "../../hooks/useFriendStats";
import { gameNames } from "../../util/consts";
import type { SafeUserInfo } from "@gamenite/shared";

type SharedStatsProps = {
  user: SafeUserInfo;
};

/**
 * Shows the shared game stats between the current user and the profile being viewed,
 * only shows if the two users are friends and have played games together in their history.
 *
 * @param user the SafeUserInfo of the profile being viewed
 */
export default function SharedStats({ user }: SharedStatsProps) {
  const stats = useFriendStats(user.username);

  // don't render if they are not friends, still loading, or no games played together yet
  if (!stats || !stats.isFriend) return null;

  const { totalGamesPlayedTogether, userATotalWins, userBTotalWins, byGame } = stats;

  // overall winner
  const youWinOverall = userATotalWins > userBTotalWins;
  const theyWinOverall = userBTotalWins > userATotalWins;
  const tiedOverall = userATotalWins === userBTotalWins;

  return (
    <>
      <h3 className="profile-section-title shared-stats-title">Your Shared Stats</h3>

      <div className="shared-stats-card">
        <h4 className="shared-stats-subtitle">
          Games you and <span className="shared-stats-friend-name">{user.display}</span> have played
          together
        </h4>

        {totalGamesPlayedTogether === 0 ? (
          <p className="shared-stats-empty">
            You haven't finished any games together yet. Challenge them!
          </p>
        ) : (
          <>
            {/* Overall wins summary */}
            <div className="shared-stats-overall">
              <div
                className={`shared-stats-overall-box ${youWinOverall ? "shared-stats-winner" : tiedOverall ? "shared-stats-tied" : "shared-stats-losing"}`}
              >
                <span className="shared-stats-overall-label">Your Total Wins</span>
                <span className="shared-stats-overall-count">{userATotalWins}</span>
              </div>
              <div className="shared-stats-overall-vs">VS</div>
              <div
                className={`shared-stats-overall-box ${theyWinOverall ? "shared-stats-winner" : tiedOverall ? "shared-stats-tied" : "shared-stats-losing"}`}
              >
                <span className="shared-stats-overall-label">{user.display}'s Total Wins</span>
                <span className="shared-stats-overall-count">{userBTotalWins}</span>
              </div>
            </div>

            {/* Per-game breakdown */}
            <div className="shared-stats-games">
              {byGame.map(({ gameType, gamesPlayed, userAWins, userBWins }) => {
                const total = userAWins + userBWins;
                const youWin = userAWins > userBWins;
                const theyWin = userBWins > userAWins;
                const tied = userAWins === userBWins;

                // bar widths, proportional to wins out of total, or 50/50 if no wins
                const yourBarPct = total === 0 ? 50 : Math.round((userAWins / total) * 100);
                const theirBarPct = 100 - yourBarPct;

                return (
                  <div key={gameType} className="shared-stats-game-row">
                    <div className="shared-stats-game-header">
                      <span className="shared-stats-game-name">{gameNames[gameType]}</span>
                      <span className="shared-stats-game-count">
                        {gamesPlayed} game{gamesPlayed === 1 ? "" : "s"} together
                      </span>
                    </div>

                    {/* Dual bar */}
                    <div className="shared-stats-dual-bar">
                      <div
                        className={`shared-stats-bar-yours ${youWin ? "shared-stats-bar-winning" : tied ? "shared-stats-bar-tied" : "shared-stats-bar-losing"}`}
                        style={{ width: `${yourBarPct}%` }}
                      />
                      <div
                        className={`shared-stats-bar-theirs ${theyWin ? "shared-stats-bar-winning" : tied ? "shared-stats-bar-tied" : "shared-stats-bar-losing"}`}
                        style={{ width: `${theirBarPct}%` }}
                      />
                    </div>

                    {/* Win labels */}
                    <div className="shared-stats-win-labels">
                      <span className={youWin ? "shared-stats-label-winner" : ""}>
                        Your wins: {userAWins}
                      </span>
                      <span className={theyWin ? "shared-stats-label-winner" : ""}>
                        {user.display}'s wins: {userBWins}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total games footer */}
            <div className="shared-stats-footer">
              <span>
                {totalGamesPlayedTogether} total game{totalGamesPlayedTogether === 1 ? "" : "s"}{" "}
                played together
              </span>
              {tiedOverall && <span className="shared-stats-tied-badge">🤝 All Tied Up!</span>}
              {youWinOverall && (
                <span className="shared-stats-winning-badge">🏆 You're winning!</span>
              )}
              {theyWinOverall && (
                <span className="shared-stats-losing-badge">😤 They're ahead!</span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { Link } from "react-router-dom";
import useRecentlyPlayedGames from "../../hooks/useRecentlyPlayedGames";
import useTimeSince from "../../hooks/useTimeSince";
import { gameNames } from "../../util/consts";
import GameImage from "./GameImage";

type RecentlyPlayedGamesProps = {
  username: string;
};

/**
 * Shows the recently played games section on a profile.
 * @param username the username of the profile being viewed
 * @returns the recently played games UI, or nothing if there are no recent games
 */
export default function RecentlyPlayedGames({ username }: RecentlyPlayedGamesProps) {
  //gets the user's most recently palyed games
  const recentlyPlayedGames = useRecentlyPlayedGames(username);
  const timeSince = useTimeSince();

  //if user has not played any recent games, don't show anything
  if (recentlyPlayedGames.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className="profile-section-title recently-played-title">Recently Played Games</h3>

      <div className="games">
        {/* only shows the 3 most recent games on the profile */}
        {recentlyPlayedGames.slice(0, 3).map((entry) => (
          <Link key={entry.gameId} className="game-entry" to={`/game/${entry.gameId}`}>
            {/* shows image for the game's type */}
            <GameImage game={entry.gameType} />
            {/* shows name and when it was played last */}
            <span className="game-type">{gameNames[entry.gameType]}</span> -{" "}
            <span className="date-played">{timeSince(entry.datePlayed)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

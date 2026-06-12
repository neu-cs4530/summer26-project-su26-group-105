import "./Profile.css";
import ProfileImage from "../ProfileImage";
import SocialMedia from "../SocialMedia";
import useUser from "../../hooks/useUser";
import useTimeSince from "../../hooks/useTimeSince";
import useRecentlyPlayedGames from "../../hooks/useRecentlyPlayedGames";
import { Link } from "react-router-dom";
import type { GameKey } from "@gamenite/shared";
import { gameNames } from "../../util/consts";
import Nim from "../../assets/nim.png";
import One from "../../assets/one.png";
import Guess from "../../assets/numberguesser.png";

type ViewableProfileProps = {
  username: string;
};

/**
 * Component for displaying a user's profile information.
 * @param username The username of the user whose profile to display
 */
export default function ViewableProfile({ username }: ViewableProfileProps) {
  const user = useUser(username);
  const recentlyPlayedGames = useRecentlyPlayedGames(username);
  const timeSince = useTimeSince();

  if ("message" in user) {
    return (
      <div className="content spacedSection">
        <p>{user.message}</p>
      </div>
    );
  }

  return (
    <div className="content spacedSection profile-container">
      <div className="pfp">
        <ProfileImage src={user.image} size="large" />
      </div>
      <div className="name">
        <h1>{user.display}</h1>
        <span className="join-date">Joined {timeSince(user.createdAt)}</span>
      </div>
      <div className="socials">
        {user.socialMedias.map((s, i) => (
          <SocialMedia socialMedia={s} />
        ))}
      </div>
      <p className="bio">{user.bio}</p>
      {recentlyPlayedGames.length > 0 && (
        <div className="games">
          <h3>Recently Played Games</h3>

          {recentlyPlayedGames.map((entry) => (
            <Link key={entry.gameId} className="game-entry" to={`/game/${entry.gameId}`}>
              <GameImage game={entry.gameType} />
              <span className="game-type">{gameNames[entry.gameType]}</span> -{" "}
              <span className="date-played">{timeSince(entry.datePlayed)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GameImage({ game }: { game: GameKey }) {
  let gameSrc: string;
  switch (game) {
    case "guess":
      gameSrc = Guess;
      break;
    case "nim":
      gameSrc = Nim;
      break;
    case "one":
      gameSrc = One;
      break;
    default:
      return null;
  }

  return <img src={gameSrc} alt={`${gameNames[game]} Game`} className="game-image" />;
}

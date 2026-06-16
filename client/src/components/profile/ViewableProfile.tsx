import "./Profile.css";
import ProfileImage from "../ProfileImage";
import SocialMedia from "../SocialMedia";
import useUser from "../../hooks/useUser";
import useTimeSince from "../../hooks/useTimeSince";
import ProfileStats from "./ProfileStats";
import RecentlyPlayedGames from "./RecentlyPlayedGames";

type ViewableProfileProps = {
  username: string;
};

/**
 * Component for displaying another user's public profile information.
 * @param username The username of the user whose profile to display
 * @returns the viewable profile page UI
 */
export default function ViewableProfile({ username }: ViewableProfileProps) {
  //gets the profiled ata for the user being looked at
  const user = useUser(username);
  const timeSince = useTimeSince();

  //if user could not be found, display error message
  if ("message" in user) {
    return (
      <div className="content spacedSection">
        <p>{user.message}</p>
      </div>
    );
  }

  return (
    <div className="content spacedSection profile-layout">
      {/* left side shows user's basic profile info */}
      <section className="profile-left-panel">
        {/* Shows user's profile pic */}
        <div className="pfp">
          <ProfileImage src={user.image} decorations={user.decorations} size="large" />
        </div>

        {/* show users display name and join date */}
        <div className="name">
          <h1>{user.display}</h1>
          <span className="join-date">Joined {timeSince(user.createdAt)}</span>
        </div>

        {/* Display user's bio */}
        <p className="bio">{user.bio}</p>

        {/* Display user's linked social media accounts */}
        <div className="socials">
          {user.socialMedias.map((s, i) => (
            <SocialMedia key={i + s.link + s.username} socialMedia={s} />
          ))}
        </div>
      </section>

      {/*Right side shows the game stats and recently played games */}
      <section className="profile-right-panel">
        <ProfileStats username={username} />
        <RecentlyPlayedGames username={username} />
      </section>
    </div>
  );
}

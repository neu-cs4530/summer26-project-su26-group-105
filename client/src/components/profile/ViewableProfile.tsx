import "./Profile.css";
import ProfileImage from "../ProfileImage";
import SocialMedia from "../SocialMedia";
import useUser from "../../hooks/useUser";
import useTimeSince from "../../hooks/useTimeSince";

type ViewableProfileProps = {
  username: string;
};

/**
 * Component for displaying a user's profile information.
 * @param username The username of the user whose profile to display
 */
export default function ViewableProfile({ username }: ViewableProfileProps) {
  const user = useUser(username);
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
    </div>
  );
}

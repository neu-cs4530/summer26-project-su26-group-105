import { Link } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext";
import type { SafeUserInfo } from "@gamenite/shared";
import ProfileImage from "./ProfileImage";
import "./DisplayName.css";
import { useId } from "react";
import useUserCard from "../hooks/useUserCard";
import { useFriendStatus } from "../contexts/FriendStatusContext";

type DisplayNameProps = {
  user: SafeUserInfo;
  showFullInfo?: boolean;
};

/**
 * Component for displaying a user's display name with a link to their profile.
 * Also displays profile image with activity status dot (for friends)
 *  and shows a user card on hover.
 * @param user The user whose display name to show
 * @param showFullInfo If false/not specified, the current user will only be displayed as "you"
 */
export default function DisplayName({ user, showFullInfo }: DisplayNameProps) {
  const { user: currentUser } = useLoginContext();
  const { setDisplayedUser, stopDisplaying } = useUserCard();
  const activityStatus = useFriendStatus(user.username);
  const id = useId();

  const anchorName = `--user-card-anchor-${id}`;

  if (currentUser.username === user.username && !showFullInfo) return "you";

  const handleMouseEnter = () => {
    setDisplayedUser(user, anchorName);
  };

  const handleMouseLeave = () => {
    stopDisplaying(anchorName);
  };

  return (
    <Link
      to={`/profile/${user.username}`}
      className="display-name"
      style={{ anchorName }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ProfileImage src={user.image} size="small" activityStatus={activityStatus} /> {user.display}
    </Link>
  );
}

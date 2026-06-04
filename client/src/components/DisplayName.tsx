import { Link } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext";
import type { SafeUserInfo } from "@gamenite/shared";
import ProfileImage from "./ProfileImage";
import "./DisplayName.css";
import { useId } from "react";
import useUserCard from "../hooks/useUserCard";

type DisplayNameProps = {
  user: SafeUserInfo;
};

export default function DisplayName({ user }: DisplayNameProps) {
  const { user: currentUser } = useLoginContext();
  const { setDisplayedUser, stopDisplaying } = useUserCard();
  const id = useId();

  const anchorName = `--user-card-anchor-${id}`;

  if (currentUser.username === user.username) return "you";

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
      <ProfileImage src={user.image} size="small" /> {user.display}
    </Link>
  );
}

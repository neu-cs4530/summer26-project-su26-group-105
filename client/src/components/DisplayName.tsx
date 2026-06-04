import { Link } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext";
import type { SafeUserInfo } from "@gamenite/shared";
import ProfileImage from "./ProfileImage";
import "./DisplayName.css";

type DisplayNameProps = {
  user: SafeUserInfo;
};

export default function DisplayName({ user }: DisplayNameProps) {
  const { user: currentUser } = useLoginContext();
  if (currentUser.username === user.username) return "you";

  return (
    <Link to={`/profile/${user.username}`} className="display-name">
      <ProfileImage src={user.image} size="small" /> {user.display}
    </Link>
  );
}

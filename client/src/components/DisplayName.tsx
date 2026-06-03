import { NavLink } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext";
import type { SafeUserInfo } from "@gamenite/shared";

type DisplayNameProps = {
  user: SafeUserInfo;
};

export default function DisplayName({ user }: DisplayNameProps) {
  const { user: currentUser } = useLoginContext();
  if (currentUser.username === user.username) return "you";

  return <NavLink to={`/profile/${user.username}`}>{user.display}</NavLink>;
}

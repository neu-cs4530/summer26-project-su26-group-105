import { useParams } from "react-router-dom";
import EditableProfile from "../components/profile/EditableProfile.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";
import ViewableProfile from "../components/profile/ViewableProfile.tsx";

export default function Profile() {
  const { user } = useLoginContext();
  const { username } = useParams();

  if (user.username === username) {
    return <EditableProfile />;
  }

  return <ViewableProfile username={username || ""} />;
}

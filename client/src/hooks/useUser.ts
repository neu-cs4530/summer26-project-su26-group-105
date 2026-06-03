import type { ErrorMsg, SafeUserInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getUserById } from "../services/userService.ts";

/**
 * Retrieves the given username's SafeUserInfo, including display name
 * @param username The username to get the info for
 * @returns A message containing loading or error messages, or the users SafeUserInfo
 */
export default function useUser(username: string): { message: string } | SafeUserInfo {
  const [user, setUser] = useState<SafeUserInfo | ErrorMsg | null>(null);

  useEffect(() => {
    getUserById(username)
      .then(setUser)
      .catch((err) => {
        setUser({ error: `${err}` });
      });
  }, [username]);

  if (!user) return { message: "Loading..." };
  if ("error" in user) return { message: `Error: ${user.error}` };
  return user;
}

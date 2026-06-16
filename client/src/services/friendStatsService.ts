import { api } from "./api.ts";
import type { ErrorMsg, UserAuth } from "@gamenite/shared";
import type { FriendStats } from "../util/friendStatsTypes.ts";

const USER_API_URL = `/api/user`;

/**
 * Fetches the shared game stats between the current user and a friended user.
 * @param auth the current user's credentials
 * @param username the username of the friend user
 * @returns the shared stats, or throws on error
 */
export const getFriendStats = async (auth: UserAuth, username: string): Promise<FriendStats> => {
  const res = await api.post<FriendStats | ErrorMsg>(
    `${USER_API_URL}/${username}/friendstats`,
    auth,
  );
  if ("error" in res.data) throw new Error(res.data.error);
  return res.data;
};

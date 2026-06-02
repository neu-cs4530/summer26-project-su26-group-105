import type { SafeUserInfo, UserUpdateRequest } from "@gamenite/shared";
import { createContext } from "react";
import type { GameSocket } from "../util/types.ts";

/**
 * The user information held as part of a login context
 *
 * - user - the current user
 * - pass - the user's password
 * - reset - a callback that logs out the user
 */
export interface AuthContext {
  user: SafeUserInfo;
  pass: string;
  reset: () => void;
  update: (info: UserUpdateRequest) => Promise<SafeUserInfo>;
}
export type LoginContextType = AuthContext & {
  socket: GameSocket;
};

/**
 * See useLoginContext()
 */
export const LoginContext = createContext<LoginContextType | null>(null);

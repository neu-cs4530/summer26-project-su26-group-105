import type { SafeUserInfo, UserUpdateRequest } from "@gamenite/shared";
import { createContext } from "react";
import type { GameSocket } from "../util/types.ts";

/**
 * The user information held as part of a login context
 *
 * - user - the current user
 * - pass - the user's password
 * - reset - a callback that logs out the user
 * - update - a callback that updates the user's information, returning the new user info
 */
export interface AuthContext {
  user: SafeUserInfo;
  pass: string;
  reset: () => void;
  update: (info: UserUpdateRequest) => Promise<SafeUserInfo>;
}

/**
 * The entire login context, consisting of auth info and the game socket
 * - user - the current user
 * - pass - the user's password
 * - reset - a callback that logs out the user
 * - update - a callback that updates the user's information, returning the new user info
 * - socket - the game socket, which can be used to send and receive game events
 */
export type LoginContextType = AuthContext & {
  socket: GameSocket;
};

/**
 * See useLoginContext()
 */
export const LoginContext = createContext<LoginContextType | null>(null);

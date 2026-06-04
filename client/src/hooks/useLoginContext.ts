import { useContext } from "react";
import { LoginContext, type LoginContextType } from "../contexts/LoginContext.ts";

/**
 * Custom hook to access the LoginContext.
 * @throws if outside a LoginContext
 * @returns context information associated with a logged-in user:
 * - `socket`: the Socket.IO connection
 * - `user`: the logged-in user's information
 * - `pass`: the logged-in user's password (it's bad web dev to keep this around! but we're using it for our nonstandard auth process)
 * - `reset`: a callback
 *  - `update`: a callback to update the user's information
 */
export default function useLoginContext(): LoginContextType {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error("Login context is null.");
  }

  return context;
}

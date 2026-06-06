import { useContext } from "react";
import { UserCardContext, type UserCardContextType } from "../contexts/UserCardContext.ts";

export default function useUserCard(): UserCardContextType {
  const context = useContext(UserCardContext);
  if (!context) {
    throw new Error("User card context is null.");
  }

  return context;
}

import type { SafeUserInfo } from "@gamenite/shared";
import { createContext } from "react";

export type UserCardContextType = {
  setDisplayedUser: (user: SafeUserInfo, anchor: string) => void;
  stopDisplaying: (anchor: string) => void;
};

export const UserCardContext = createContext<null | UserCardContextType>(null);

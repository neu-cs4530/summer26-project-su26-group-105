import type { SafeUserInfo } from "@gamenite/shared";
import { createContext } from "react";

/**
 * The functions necessary to display a user card on hover.
 *
 * - setDisplayedUser - Sets the user to be displayed on the card, anchoring the card to the "anchor" element
 * - stopDisplaying - Hides the user card if it's actively to the given element
 */
export type UserCardContextType = {
  setDisplayedUser: (user: SafeUserInfo, anchor: string) => void;
  stopDisplaying: (anchor: string) => void;
};

/**
 * @see useUserCard
 */
export const UserCardContext = createContext<null | UserCardContextType>(null);

import type { SafeUserInfo } from "@gamenite/shared";
import "./Player.css";
import ProfileImage from "../../components/ProfileImage";

type PlayerProps = {
  user: SafeUserInfo;
  numCards: number;
  isTurn: boolean;
};

export function userAnchor(user: SafeUserInfo) {
  return `--player-${user.username.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Represents a Player in the One game, showing/linking to their profile, showing if it's their
 * turn, and how many cards they have(without revealing the actual cards)
 * @param user The user info of the player
 * @param numCards The number of cards the player has in their hand
 * @param isTurn Whether it's currently this player's turn
 */
export default function Player({ user, numCards, isTurn }: PlayerProps) {
  return (
    <div className="one-player" data-active={isTurn}>
      <ProfileImage src={user.image} decorations={user.decorations} size="medium" />
      <span>
        <span className="name">{user.display}</span>
        <span className="cards-number" style={{ anchorName: userAnchor(user) }}>
          {numCards}
        </span>
      </span>
    </div>
  );
}

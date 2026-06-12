import type { SafeUserInfo } from "@gamenite/shared";
import DisplayName from "../../components/DisplayName";
import "./Player.css";

type PlayerProps = {
  user: SafeUserInfo;
  numCards: number;
  isTurn: boolean;
};

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
      <DisplayName user={user} />
      <div className="cards">
        {numCards > 0 && <div className="card-back" />}
        {numCards > 1 && <div className="card-back" />}
        <span className="cards-number">{numCards}</span>
      </div>
    </div>
  );
}

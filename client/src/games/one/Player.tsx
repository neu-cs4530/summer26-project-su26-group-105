import type { SafeUserInfo } from "@gamenite/shared";
import DisplayName from "../../components/DisplayName";
import "./Player.css";

type PlayerProps = {
  user: SafeUserInfo;
  numCards: number;
  isTurn: boolean;
};

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

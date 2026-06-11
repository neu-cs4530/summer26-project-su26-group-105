import type { CSSProperties } from "react";
import "./Card.css";
import type { Card } from "@gamenite/shared";

type CardProps = {
  card: Card | null;
  onClick?: () => void;
  onHover?: () => void;
  location: { x: number; y: number };
  rotation?: number;
};

export default function Card({ card, onClick, onHover, location, rotation }: CardProps) {
  const style: CSSProperties = {
    left: `${location.x}%`,
    top: `${location.y}%`,
    cursor: "not-allowed",
  };
  if (onClick) style.cursor = "pointer";

  if (rotation) style.rotate = `${rotation}deg`;

  return (
    <div
      className="one-card"
      data-back={card === null}
      data-color={card?.color}
      data-type={card?.value}
      onClick={() => onClick?.()}
      onMouseEnter={() => onHover?.()}
      style={style}
    >
      {!!card && card.value}
    </div>
  );
}

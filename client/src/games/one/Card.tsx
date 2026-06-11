import type { CSSProperties } from "react";
import "./Card.css";
import type { Card } from "@gamenite/shared";

type CardProps = {
  card: Card | null;
  isButton?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  location: { x: number; y: number };
  rotation?: number;
};

export default function Card({ card, onClick, isButton, onHover, location, rotation }: CardProps) {
  const style: CSSProperties = {
    left: `${location.x}%`,
    top: `${location.y}%`,
    cursor: "not-allowed",
  };
  if (onClick) style.cursor = "pointer";

  if (rotation) style.rotate = `${rotation}deg`;

  let text: string | null = card?.value ?? null;
  switch (card?.value) {
    case "reverse":
      text = "↺";
      break;
    case "wildDraw4":
      text = "+4";
      break;
    case "draw2":
      text = "+2";
      break;
    case "skip":
      text = "⏭";
      break;
  }

  return (
    <div
      className="one-card"
      data-back={card === null}
      data-color={card?.color}
      data-type={card?.value}
      data-inactive={isButton && !onClick}
      onClick={() => onClick?.()}
      onMouseEnter={() => onHover?.()}
      style={style}
    >
      <span className="one-card-top">{text}</span>
      <span className="one-card-middle">{text}</span>
      <span className="one-card-bottom">{text}</span>
    </div>
  );
}

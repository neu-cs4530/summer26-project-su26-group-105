import type { Card as CardType, OneMove, OneView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import Card from "./one/Card.tsx";
import { useState, type MouseEvent } from "react";
import "./OneGame.css";
import Player from "./one/Player.tsx";
import DisplayName from "../components/DisplayName.tsx";

export default function OneGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<OneView, OneMove>) {
  const isUserTurn = view.nextPlayer === userPlayerIndex;
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [wildCardId, setWildCardId] = useState<string | null>(null);

  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (y < 50) setHoveredCardIdx(null);
  }

  function getHandCardCoordinates(index: number): { x: number; y: number; rotation: number } {
    const handX = 50;
    const handY = 80;
    const totalArc = Math.PI;
    const xRadius = 12;
    const yRadius = 6;

    const angle = -totalArc / 2 + (index / (view.yourHand.length - 1)) * totalArc;

    let x = handX + Math.sin(angle) * xRadius;
    let y = handY + yRadius - Math.cos(angle) * yRadius;

    if (hoveredCardIdx !== null) {
      const dist = index - hoveredCardIdx;
      const offset = dist === 1 ? 1 : Math.sign(dist) * 5 * Math.exp(-Math.abs(dist) / 2);
      x += Math.cos(angle) * offset;
      y += Math.sin(angle) * offset;

      if (hoveredCardIdx === index) {
        y -= 5;
      }
    }
    return { x, y, rotation: angle * 0.15 * (180 / Math.PI) };
  }

  function isValidMove(card: CardType) {
    const top = { ...view.discardTop, color: view.activeColor };

    if (card.color === "wild" || card.color === top.color || card.value === top.value) {
      return true;
    }

    return false;
  }

  const drawFunction =
    isUserTurn && !view.hasDrawnThisTurn ? () => makeMove({ type: "draw" }) : undefined;

  function moveFunction(c: CardType) {
    if (!isUserTurn) return undefined;
    if (!isValidMove(c)) return undefined;
    if (c.color === "wild") {
      return () => setWildCardId(c.id);
    }
    return () => makeMove({ type: "play", cardId: c.id });
  }

  const otherPlayers = [
    ...players.slice(userPlayerIndex + 1),
    ...players.slice(0, userPlayerIndex),
  ];
  const playersPerSide = Math.max(Math.floor(otherPlayers.length / 3), 1);

  const discardCard =
    view.discardTop.color === "wild"
      ? { ...view.discardTop, color: view.activeColor }
      : view.discardTop;

  const winnerIdx = view.playerHandCounts.findIndex((count) => count === 0);

  return (
    <div onMouseMove={handleMouseMove} className="one-game">
      <div
        className="direction-indicator"
        data-direction={view.direction === 1 ? "clockwise" : "counterclockwise"}
      />
      <div className="players players-left">
        {otherPlayers.slice(0, playersPerSide).map((p) => (
          <Player
            user={p}
            numCards={view.playerHandCounts[players.indexOf(p)]}
            isTurn={players.indexOf(p) === view.nextPlayer}
          />
        ))}
      </div>
      <div className="players players-top">
        {otherPlayers.slice(playersPerSide, playersPerSide * 2).map((p) => (
          <Player
            user={p}
            numCards={view.playerHandCounts[players.indexOf(p)]}
            isTurn={players.indexOf(p) === view.nextPlayer}
          />
        ))}
      </div>
      <div className="players players-right">
        {otherPlayers.slice(playersPerSide * 2).map((p) => (
          <Player
            user={p}
            numCards={view.playerHandCounts[players.indexOf(p)]}
            isTurn={players.indexOf(p) === view.nextPlayer}
          />
        ))}
      </div>
      <Card card={null} location={{ x: 10, y: 15 }} onClick={drawFunction} isButton />
      <Card card={discardCard} location={{ x: 50, y: 50 }} />
      {view.yourHand.map((c, i) => {
        const loc = getHandCardCoordinates(i);

        return (
          <Card
            card={c}
            key={c.id}
            isButton
            onClick={moveFunction(c)}
            onHover={() => setHoveredCardIdx(i)}
            location={{ x: loc.x, y: loc.y }}
            rotation={loc.rotation}
          />
        );
      })}
      {isUserTurn && view.hasDrawnThisTurn && (
        <button className="skip-button" onClick={() => makeMove({ type: "pass" })}>
          Skip Turn
        </button>
      )}
      {wildCardId && (
        <div className="color-picker">
          <h3>Choose a color</h3>
          <div className="color-options">
            {(["red", "blue", "green", "yellow"] as const).map((color) => (
              <button
                key={color}
                className="color-button"
                style={{ backgroundColor: color }}
                onClick={() => {
                  makeMove({ type: "play", cardId: wildCardId, chosenColor: color });
                  setWildCardId(null);
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}
      {winnerIdx !== -1 && (
        <div className="winner-overlay">
          <h2>
            <DisplayName user={players[winnerIdx]} showFullInfo /> wins!
          </h2>
        </div>
      )}
    </div>
  );
}

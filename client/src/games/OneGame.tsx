import type { Card as CardType, OneMove, OneView, SafeUserInfo } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import Card from "./one/Card.tsx";
import { Fragment, useEffect, useState, type MouseEvent } from "react";
import "./OneGame.css";
import Player, { userAnchor } from "./one/Player.tsx";
import DisplayName from "../components/DisplayName.tsx";

export default function OneGame({
  view: serverView,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<OneView, OneMove>) {
  const [view, setView] = useState<OneView>({ ...serverView, lastTurnActions: [] });
  const isUserTurn = view.nextPlayer === userPlayerIndex;
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [wildCardId, setWildCardId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setView((view) => ({ ...view, lastTurnActions: [] }));
      for (const action of serverView.lastTurnActions) {
        if (action.type === "play") {
          setView((view) => ({ ...view, lastTurnActions: [...view.lastTurnActions, action] }));
          await new Promise((resolve) => setTimeout(resolve, 300));
          setView((view) => ({
            ...view,
            discardTop: serverView.discardTop,
            activeColor: serverView.activeColor,
          }));
          if (action.userIndex === userPlayerIndex) {
            setView((view) => ({
              ...view,
              yourHand: serverView.yourHand,
            }));
          } else {
            setView((view) => ({
              ...view,
              playerHandIds: view.playerHandIds.map((hand, idx) =>
                idx === action.userIndex ? hand.filter((id) => id !== action.card.id) : hand,
              ),
            }));
          }
        } else if (action.type === "draw") {
          setView((view) => ({ ...view, lastTurnActions: [...view.lastTurnActions, action] }));
          for (const id of action.cardIds) {
            if (action.userIndex === userPlayerIndex) {
              setView((view) => ({
                ...view,
                yourHand: [...view.yourHand, serverView.yourHand.find((c) => c.id === id)!],
              }));
            } else {
              setView((view) => ({
                ...view,
                playerHandIds: view.playerHandIds.map((hand, idx) =>
                  idx === action.userIndex ? [...hand, id] : hand,
                ),
              }));
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
      setView(serverView);
    })();
  }, [serverView, userPlayerIndex]);

  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (y < 50) setHoveredCardIdx(null);
  }

  function isCardPlayed(c: string) {
    return view.lastTurnActions.some((action) => action.type === "play" && action.card.id === c);
  }

  function getHandCardCoordinates(
    c: CardType,
    index: number,
  ): { x: number; y: number; rotation: number } {
    if (isCardPlayed(c.id)) return { x: 50, y: 50, rotation: 0 };

    const handX = 50;
    const handY = 80;
    const totalArc = Math.PI;
    const xRadius = 12;
    const yRadius = 6;

    const angle =
      view.yourHand.length === 1
        ? 0
        : -totalArc / 2 + (index / (view.yourHand.length - 1)) * totalArc;

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

  function getOtherCardCoordinates(user: SafeUserInfo, card: string) {
    if (isCardPlayed(card)) {
      return { x: "50%", y: "50%", isSmall: false };
    }

    return {
      x: `anchor(${userAnchor(user)} left)`,
      y: `anchor(${userAnchor(user)} top)`,
      isSmall: true,
    };
  }

  function getOtherCard(card: string) {
    if (!isCardPlayed(card)) return null;

    const action = view.lastTurnActions.find(
      (a) => a.type === "play" && a.card.id === card,
    ) as Extract<(typeof view.lastTurnActions)[number], { type: "play" }>;
    return action.card;
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

  const otherPlayers =
    userPlayerIndex === -1
      ? players
      : [...players.slice(userPlayerIndex + 1), ...players.slice(0, userPlayerIndex)];
  const playersPerSide = Math.max(Math.floor(otherPlayers.length / 3), 1);

  const discardCard =
    view.discardTop.color === "wild"
      ? { ...view.discardTop, color: view.activeColor }
      : view.discardTop;

  const winnerIdx = view.playerHandIds.findIndex((hand) => hand.length === 0);

  function playerComponent({ player }: { player: SafeUserInfo }) {
    const idx = players.indexOf(player);
    const hand = view.playerHandIds[idx];
    return <Player user={player} numCards={hand.length} isTurn={idx === view.nextPlayer} />;
  }

  return (
    <div onMouseMove={handleMouseMove} className="one-game">
      <div
        className="direction-indicator"
        data-direction={view.direction === 1 ? "clockwise" : "counterclockwise"}
      />
      <div className="players players-left">
        {otherPlayers.slice(0, playersPerSide).map((p) => (
          <Fragment key={p.username}>{playerComponent({ player: p })}</Fragment>
        ))}
      </div>
      <div className="players players-top">
        {otherPlayers.slice(playersPerSide, playersPerSide * 2).map((p) => (
          <Fragment key={p.username}>{playerComponent({ player: p })}</Fragment>
        ))}
      </div>
      <div className="players players-right">
        {otherPlayers.slice(playersPerSide * 2).map((p) => (
          <Fragment key={p.username}>{playerComponent({ player: p })}</Fragment>
        ))}
      </div>
      <Card card={discardCard} location={{ x: "50%", y: "50%" }} />
      {otherPlayers.flatMap((p) => {
        const idx = players.indexOf(p);
        const hand = view.playerHandIds[idx];
        return hand.map((c) => (
          <Card card={getOtherCard(c)} location={getOtherCardCoordinates(p, c)} key={c} />
        ));
      })}
      <Card card={null} location={{ x: "10%", y: "15%" }} onClick={drawFunction} isButton />
      {view.yourHand.map((c, i) => {
        const loc = getHandCardCoordinates(c, i);

        return (
          <Card
            card={c}
            key={c.id}
            isButton
            onClick={moveFunction(c)}
            onHover={() => setHoveredCardIdx(i)}
            // from={view.lastTurnActions.{}}
            location={{ x: `${loc.x}%`, y: `${loc.y}%` }}
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
                style={{ backgroundColor: color, color: color === "yellow" ? "black" : "white" }}
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
      {isUserTurn &&
        view.yourHand.length > 0 &&
        view.yourHand.every((c) => !isValidMove(c)) &&
        !view.hasDrawnThisTurn && <div className="no-valid">no cards to play, draw one!</div>}
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

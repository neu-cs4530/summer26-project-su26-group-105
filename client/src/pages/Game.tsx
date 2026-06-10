import "./Game.css";
import { useParams } from "react-router-dom";
import { getGameById } from "../services/gameService.ts";
import { useEffect, useState } from "react";
import type { GameInfo } from "@gamenite/shared";
import ChatPanel from "../components/ChatPanel.tsx";
import GamePanel from "../components/GamePanel.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";

export default function Game() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const { socket } = useLoginContext();

  useEffect(() => {
    let ignore = false;
    // non-nullish assertion is ok here given that Game is only called in a
    // route with `:gameId`
    getGameById(gameId!)
      .then((game) => {
        if (ignore) return;
        setGame(game);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      ignore = true;
    };
  }, [gameId]);

  useEffect(() => {
    const handleWatchError = (payload: { error: string }) => {
      setAccessError(payload.error);
    };
    socket.on("gameWatchError", handleWatchError);
    return () => {
      socket.off("gameWatchError", handleWatchError);
    };
  }, [socket]);

  if (accessError) {
    return (
      <div className="content spacedSection">
        <p className="error-message">🔒 {accessError}</p>
      </div>
    );
  }

  return (
    game && (
      <>
        <div className="gameContainer">
          <GamePanel {...game} />
          <ChatPanel chatId={game.chat} />
        </div>
      </>
    )
  );
}

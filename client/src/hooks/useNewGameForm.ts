import type { GameKey } from "@gamenite/shared";
import { useState } from "react";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";
import useLoginContext from "./useLoginContext.ts";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `friendOnly`
 *  - Possibly-null error message `err`
 *  - Form handlers `toggleFriendOnly` and `handleGameClick` */
export default function useNewGameForm() {
  //tracks if game should be friends only or public
  const [friendOnly, setFriendOnly] = useState(false);
  //stores error if there is one
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const { socket } = useLoginContext();
  const navigate = useNavigate();

  const toggleFriendOnly = () => {
    setFriendOnly((v) => !v);
  };

  //creates a game with the selected game key
  const createSelectedGame = async (selectedGameKey: GameKey) => {
    setErr(null);
    try {
      //creates the game and if its friends only or public
      const game = await createGame(auth, selectedGameKey, friendOnly);
      //emits that friend created a game (notification)
      socket.emit("friendGameCreated", { auth, payload: game.gameId });
      //sends user directly into newly created game
      await navigate(`/game/${game.gameId}`);
    } catch (err) {
      setErr(`${err}`);
    }
  };

  //handles game card click
  const handleGameClick = async (selectedGameKey: GameKey) => {
    await createSelectedGame(selectedGameKey);
  };

  return {
    friendOnly,
    err,
    toggleFriendOnly,
    handleGameClick,
  };
}

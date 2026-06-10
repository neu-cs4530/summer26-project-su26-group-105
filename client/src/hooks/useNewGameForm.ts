import type { GameKey } from "@gamenite/shared";
import { type ChangeEvent, type FormEvent, useState } from "react";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `gameKey`
 *  - Form value `friendOnly`
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange`, `toggleFriendOnly`, and `handleSubmit`
 */
export default function useNewGameForm() {
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [friendOnly, setFriendOnly] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);

    // type assertion is safe because NewGame.tsx only allows selection of
    // valid game keys
    setGameKey(e.target.value as GameKey | "");
  };

  const toggleFriendOnly = () => {
    setFriendOnly((v) => !v);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }
    setErr(null);
    try {
      const game = await createGame(auth, gameKey, friendOnly);
      await navigate(`/game/${game.gameId}`);
    } catch (err) {
      setErr(`${err}`);
    }
  };

  return {
    gameKey,
    friendOnly,
    err,
    handleInputChange,
    toggleFriendOnly,
    handleSubmit,
  };
}

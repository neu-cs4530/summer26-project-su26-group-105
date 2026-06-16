import type { GameKey } from "@gamenite/shared";
import { validBracketSizes } from "@gamenite/shared";
import { useMemo, useState } from "react";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";
import { createTournament } from "../services/tournamentService.ts";
import useLoginContext from "./useLoginContext.ts";

/**
 * Custom hook to manage game creation form logic
 * @param isTournament - whether this form creates a tournament (true) or a
 *   single game (false); decided by which page/tab the user came from
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `friendOnly`
 *  - The tournament settings `gameSize`/`bracketSize`
 *  - `bracketOptions`: the valid bracket sizes for the current `gameSize`
 *  - Possibly-null error message `err`
 *  - Form handlers `toggleFriendOnly`, `setGameSize`, `setBracketSize`, and
 *    `handleGameClick` */
export default function useNewGameForm(isTournament: boolean = false) {
  //tracks if game should be friends only or public
  const [friendOnly, setFriendOnly] = useState(false);
  //tournament settings: players per match and total bracket size
  const [gameSize, setGameSize] = useState(2);
  const [bracketSize, setBracketSize] = useState(4);
  //stores error if there is one
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const { socket } = useLoginContext();
  const navigate = useNavigate();

  //valid bracket sizes (powers of the match size) for the current game size
  const bracketOptions = useMemo(() => validBracketSizes(gameSize), [gameSize]);

  const toggleFriendOnly = () => {
    setFriendOnly((v) => !v);
  };

  //updates players per match, keeping the bracket size valid for the new value
  const updateGameSize = (size: number) => {
    setGameSize(size);
    const options = validBracketSizes(size);
    if (options.length > 0 && !options.includes(bracketSize)) {
      setBracketSize(options[0]);
    }
  };

  //creates a single game with the selected game key
  const createSelectedGame = async (selectedGameKey: GameKey) => {
    const game = await createGame(auth, selectedGameKey, friendOnly);
    //emits that friend created a game (notification)
    socket.emit("friendGameCreated", { auth, payload: game.gameId });
    //sends user directly into newly created game
    await navigate(`/game/${game.gameId}`);
  };

  //creates a tournament with the selected game key and bracket settings
  const createSelectedTournament = async (selectedGameKey: GameKey) => {
    const tournament = await createTournament(
      auth,
      selectedGameKey,
      gameSize,
      bracketSize,
      friendOnly,
    );
    //sends user directly into the tournament lobby
    await navigate(`/tournament/${tournament.tournamentId}`);
  };

  //handles game card click
  const handleGameClick = async (selectedGameKey: GameKey) => {
    setErr(null);
    try {
      if (isTournament) {
        await createSelectedTournament(selectedGameKey);
      } else {
        await createSelectedGame(selectedGameKey);
      }
    } catch (err) {
      setErr(`${err}`);
    }
  };

  return {
    friendOnly,
    gameSize,
    bracketSize,
    bracketOptions,
    err,
    toggleFriendOnly,
    setGameSize: updateGameSize,
    setBracketSize,
    handleGameClick,
  };
}

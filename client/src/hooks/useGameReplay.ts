import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "./useAuth.ts";
import useLoginContext from "./useLoginContext.ts";

interface ReplayState {
  gameOver: boolean;
  voters: string[];
  required: number;
  replayGameId?: string;
}

/**
 * Custom hook to manage rematch replaying a game
 * @param gameId - the game being replayed
 * @param isPlayer - whether the current user is a player
 * @throws if outside a LoginContext
 * @returns an object containing:
 * - `gameOver`: whether the game has finished and a rematch can be offered
 * - `voters`: usernames of players who have agreed to a rematch
 * - `required`: how many players must agree
 * - `hasVoted`: whether the current user has already agreed
 * - `voteReplay`: registers the current user's agreement to a rematch
 */
export default function useGameReplay(gameId: string, isPlayer: boolean) {
  const { user, socket } = useLoginContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ReplayState>({
    gameOver: false,
    voters: [],
    required: 0,
  });

  useEffect(() => {
    const handleUpdated = (payload: {
      gameId: string;
      voters: string[];
      required: number;
      replayGameId?: string;
    }) => {
      if (payload.gameId !== gameId) return;
      setState({
        gameOver: true,
        voters: payload.voters,
        required: payload.required,
        replayGameId: payload.replayGameId,
      });
      // everyone agreed. send players into the freshly created rematch
      if (payload.replayGameId && isPlayer) {
        void navigate(`/game/${payload.replayGameId}`);
      }
    };

    socket.on("gameReplayUpdated", handleUpdated);
    return () => {
      socket.off("gameReplayUpdated", handleUpdated);
    };
  }, [gameId, socket, isPlayer, navigate]);

  function voteReplay() {
    socket.emit("gameReplayVote", { auth, payload: gameId });
  }

  return {
    gameOver: state.gameOver,
    voters: state.voters,
    required: state.required,
    hasVoted: state.voters.includes(user.username),
    voteReplay,
  };
}

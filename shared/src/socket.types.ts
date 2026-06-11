import {
  type ChatInfo,
  type ChatNewMessagePayload,
  type ChatUserJoinedPayload,
  type ChatUserLeftPayload,
} from "./chat.types.ts";
import { type NewMessagePayload } from "./message.types.ts";
import { type WithAuth } from "./auth.types.ts";
import {
  type GameKey,
  type GameMakeMovePayload,
  type GamePlayInfo,
  type TaggedGameView,
} from "./game.types.ts";
import { type SafeUserInfo } from "./user.types.ts";
import { type ActivityStatus, type FriendEntry, type SearchResult } from "./friend.types.ts";

/**
 * The Socket.io interface for client to server communication
 */
export interface ClientToServerEvents {
  chatJoin: (payload: WithAuth<string>) => void;
  chatLeave: (payload: WithAuth<string>) => void;
  chatSendMessage: (payload: WithAuth<NewMessagePayload>) => void;
  friendAccept: (payload: WithAuth<{ requestId: string }>) => void;
  friendBlock: (payload: WithAuth<{ username: string }>) => void;
  friendDecline: (payload: WithAuth<{ requestId: string }>) => void;
  friendList: (payload: WithAuth<Record<string, never>>) => void;
  friendRemove: (payload: WithAuth<{ requestId: string }>) => void;
  friendRequest: (payload: WithAuth<{ username: string }>) => void;
  friendUnblock: (payload: WithAuth<{ username: string }>) => void;
  friendSearch: (payload: WithAuth<{ query: string; type: "existing" | "all" }>) => void;
  gameJoinAsPlayer: (payload: WithAuth<string>) => void;
  gameMakeMove: (payload: WithAuth<GameMakeMovePayload>) => void;
  gameStart: (payload: WithAuth<string>) => void;
  gameWatch: (payload: WithAuth<string>) => void;
  friendGameCreated: (payload: WithAuth<string>) => void;
  gameAddBot: (payload: WithAuth<string>) => void; // string represents the gameId
  setStatus: (payload: WithAuth<{ status: ActivityStatus }>) => void;
  userConnect: (payload: WithAuth<Record<string, never>>) => void;
}

/**
 * The Socket.io interface for server to client information
 */
export interface ServerToClientEvents {
  chatJoined: (payload: ChatInfo) => void;
  chatNewMessage: (payload: ChatNewMessagePayload) => void;
  chatUserJoined: (payload: ChatUserJoinedPayload) => void;
  chatUserLeft: (payload: ChatUserLeftPayload) => void;
  notificationPopup: (payload: {
    type: "friendRequestReceived" | "friendRequestAccepted" | "gameInvite" | "friendGameActivity";
    message: string;
  }) => void;
  friendListUpdated: (payload: {
    friends: FriendEntry[];
    incoming: FriendEntry[];
    outgoing: FriendEntry[];
    blocked: FriendEntry[];
  }) => void;
  friendSearchResults: (payload: { results: SearchResult[] }) => void;
  friendStatusUpdated: (payload: {
    userId: string;
    username: string | null;
    status: ActivityStatus;
  }) => void;
  gamePlayersUpdated: (payload: SafeUserInfo[]) => void;
  gameStateUpdated: (payload: TaggedGameView & { forPlayer: boolean }) => void;
  gameWatched: (payload: GamePlayInfo) => void;
  gameWatchError: (payload: { error: string }) => void;
  leaderboardUpdated: (payload: { gameType: GameKey }) => void;
}

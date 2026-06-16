import type { AvatarDecoration, GameKey, BackgroundMusicTrack } from "@gamenite/shared";
import {
  type MessageChannel,
  type ChatMessage,
  type MessagePrivacySetting,
} from "../../shared/src/dms.types.ts";

/**
 * Record identifiers used to look up records in a database. This type
 * abbreviation is intended to suggest that the key should be a randomly
 * generated unique ID.
 */
export type RecordId = string;

/**
 * Actual JavaScript Date objects can't stored in a database that only accepts
 * JSON objects; this type indicates that the string should be the result of
 * taking a Date object and turning it to a string with the Date.toISOString()
 * method.
 */
export type DateISO = string;

/**
 * Represents a user's authorization record in the database.
 * - `userId`: the user ID of the corresponding User model
 * - `password`: the password for this user
 */
export interface AuthRecord {
  userId: RecordId; // References User models
  password: string;
}

/**
 * Represents a chat document in the database.
 * - `messages`: the ordered list of messages in the chat
 * - `createdAt`: when the chat was created
 */
export interface ChatRecord {
  messages: RecordId[]; // References Message models
  createdAt: DateISO;
}

/**
 * Represents a comment in the database.
 * - `text`: comment contents
 * - `createdBy`: user id of the commenter
 * - `createdAt`: when the comment was made
 * - `editedAt`: when the comment was last modified
 */
export interface CommentRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
  editedAt?: DateISO;
}

/**
 * Represents a game document in the database.
 * - `type`: picks which game this is
 * - `state`: absent if the game hasn't started, or the id for the game's state
 * - `chat`: id for the game's chat
 * - `players`: active players for the game
 * - `createdAt`: when the game was created
 * - `createdBy`: user id of the person who created the game
 * - `endedAt`: when the game ended
 * - `tournamentId`: set if this game is a match within a tournament bracket
 * - `tournamentRound`: which round of the tournament this match belongs to (0-indexed)
 */
export interface GameRecord {
  type: GameKey;
  state?: unknown;
  done: boolean;
  chat: RecordId; // References Chat records
  players: RecordId[]; // References User records
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  winner?: RecordId;
  endedAt?: DateISO;
  friendOnly?: boolean; // friends only gameplay
  tournamentId?: RecordId; // References Tournament records
  tournamentRound?: number;
  replayVotes?: RecordId[]; // players who agreed to a rematch (References User records)
  replayGameId?: RecordId; // the rematch game created once everyone agreed (References Game records)
}

/**
 * Represents a tournament document in the database. A tournament is a
 * single-elimination bracket of games of a single game type.
 * - `type`: which game is played in every match
 * - `status`: registering (lobby open), active (matches underway), or done
 * - `gameSize`: players per match
 * - `bracketSize`: total participants required to fill the bracket (a power of `gameSize`)
 * - `participants`: user ids registered for the tournament
 * - `rounds`: game ids grouped by round; `rounds[0]` is the first round
 * - `champion`: user id of the overall winner, set once `status` is `done`
 * - `createdBy`: user id of the person who created the tournament
 * - `createdAt`: when the tournament was created
 * - `friendOnly`: if true, only friends of the creator may register
 */
export interface TournamentRecord {
  type: GameKey;
  status: "registering" | "active" | "done";
  gameSize: number;
  bracketSize: number;
  participants: RecordId[]; // References User records
  rounds: RecordId[][]; // References Game records, grouped by round
  champion?: RecordId; // References User records
  createdBy: RecordId; // References User records
  createdAt: DateISO;
  friendOnly?: boolean;
}

/**
 * Represents a message in the database.
 * - `text`: message contents
 * - `createdBy`: user id of message sender
 * - `createdAt`: when the message was sent
 */
export interface MessageRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
}

/**
 * Represents a forum post as it's stored in the database.
 * - `title`: post title
 * - `text`: post contents
 * - `createdAt`: when the thread was posted
 * - `createdBy`: user id of OP
 * - `comments`: replies to the post
 */
export interface ThreadRecord {
  title: string;
  text: string;
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  comments: RecordId[]; // References Comment records
}

/**
 * Represents a user document in the database.
 * - `username`: Text username (a non-random key for looking up Auth records)
 * - `display`: A display name
 * - `createdAt`: when this user registered.
 */
export interface UserRecord {
  username: string; // References Auth records
  display: string;
  image: string | null;
  decorations: AvatarDecoration[];
  bio: string;
  socialMedias: {
    username: string;
    link: string;
  }[];
  settings: {
    receivesFriendRequestNotifications: boolean;
    receivesFriendAcceptedNotifications: boolean;
    receivesGameInviteNotifications: boolean;
    receivesFriendGameActivityNotifications: boolean;
    backgroundMusic: BackgroundMusicTrack;
    backgroundMusicVolume: number;
    allowMessagesFrom?: MessagePrivacySetting;
  };
  createdAt: DateISO;
}

/**
 * Represents a friend relationship between two users.
 * - `fromUserId`: the user ID who sent the friend request
 * - `toUserId`: the user ID who received the friend request
 * - `status`: the status of the request
 * - `createdAt`: when the request was sent
 * - `updatedAt`: when the request state was last updated
 */
export interface FriendsRecord {
  fromUserId: RecordId;
  toUserId: RecordId;
  status: "pending" | "accepted" | "blocked" | "removed";
  createdAt: DateISO;
  updatedAt: DateISO;
}

/**
 * Friend messaging and groupchats
 */
export type ChannelRecord = MessageChannel;
export type DirectMessageRecord = ChatMessage;

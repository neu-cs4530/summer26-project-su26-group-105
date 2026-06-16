import { createRepo } from "./keyv.ts";
import {
  type FriendsRecord,
  type AuthRecord,
  type ChatRecord,
  type CommentRecord,
  type GameRecord,
  type MessageRecord,
  type ThreadRecord,
  type UserRecord,
  type ChannelRecord,
  type DirectMessageRecord,
} from "./models.ts";

export const AuthRepo = createRepo<AuthRecord>("auth");
export const ChatRepo = createRepo<ChatRecord>("chat");
export const CommentRepo = createRepo<CommentRecord>("comment");
export const GameRepo = createRepo<GameRecord>("game");
export const MessageRepo = createRepo<MessageRecord>("message");
export const ThreadRepo = createRepo<ThreadRecord>("thread");
export const UserRepo = createRepo<UserRecord>("user");
export const FriendRepo = createRepo<FriendsRecord>("friend");
export const ChannelRepo = createRepo<ChannelRecord>("channel");
export const DirectMessageRepo = createRepo<DirectMessageRecord>("direct_message");

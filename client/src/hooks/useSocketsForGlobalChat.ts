import { useEffect, useRef, useState } from "react";
import useLoginContext from "./useLoginContext.ts";
import useAuth from "./useAuth.ts";
import { type MessageChannel, type ChatMessage } from "../../../shared/src/dms.types.ts";
import type { SearchResult } from "@gamenite/shared/src/friend.types";

//Most-recent-activity timestamp for a channel, falling back to its creation time
function channelActivityTime(channel: MessageChannel): number {
  return new Date(channel.lastActivityAt ?? channel.createdAt).getTime();
}

//Orders conversations by most recent activity (newest first)
function byRecentActivity(a: MessageChannel, b: MessageChannel): number {
  return channelActivityTime(b) - channelActivityTime(a);
}

export default function useSocketsForGlobalChat() {
  const auth = useAuth();
  const { user, socket } = useLoginContext();

  const [channels, setChannels] = useState<MessageChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // The message handler needs the current channel
  const activeChannelIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    // Join our personal room so the server can route channel/message events to us
    // this must run again on every (re)connec
    // a reconnect produces a fresh socket id that has left every room
    // which would otherwise silently drop all DM traffic as I found out the hard way
    const register = () => {
      socket.emit("registerUserSession", {
        auth: { username: user.username },
        payload: user.username,
      });
    };
    register();
    socket.on("connect", register);

    const handleChatJoined = (data: { channelId: string; messages: ChatMessage[] }) => {
      setActiveChannelId(data.channelId);
      setMessages(data.messages);
    };

    const handleChatCreated = (newChannel: MessageChannel) => {
      setChannels((prev) => {
        if (prev.some((c) => c.channelId === newChannel.channelId)) return prev;
        return [...prev, newChannel].sort(byRecentActivity);
      });
    };

    const handleMessageReceived = (newMessage: ChatMessage) => {
      // Bump the channel's activity and reorder the sidebar
      setChannels((prev) => {
        const idx = prev.findIndex((c) => c.channelId === newMessage.channelId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastActivityAt: newMessage.timestamp };
        return [updated, ...prev.filter((_, i) => i !== idx)].sort(byRecentActivity);
      });

      if (newMessage.channelId !== activeChannelIdRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.messageId === newMessage.messageId)) return prev;
        return [...prev, newMessage];
      });
    };

    const handleActionError = (data: { action: string; error: string }) => {
      setError(data.error);
    };

    const handleSearchResults = (payload: { results: SearchResult[] }) => {
      setSearchResults(payload.results);
    };

    socket.on("globalChatJoined", handleChatJoined);
    socket.on("globalChatCreated", handleChatCreated);
    socket.on("globalChatMessageReceived", handleMessageReceived);
    socket.on("globalChatActionError", handleActionError);
    socket.on("friendSearchResults", handleSearchResults);

    return () => {
      socket.off("connect", register);
      socket.off("globalChatJoined", handleChatJoined);
      socket.off("globalChatCreated", handleChatCreated);
      socket.off("globalChatMessageReceived", handleMessageReceived);
      socket.off("globalChatActionError", handleActionError);
      socket.off("friendSearchResults", handleSearchResults);
    };
  }, [socket, user.username]);

  /**
   * Start (or reopen) a DM with another user, identified by their username
   */
  function handleOpenDirectChat(recipientUsername: string) {
    setError(null);
    socket.emit("openDirectChat", { auth, payload: recipientUsername });
  }

  /**
   * Open an existing conversation the user already belongs to
   */
  function handleSelectChannel(channelId: string) {
    setError(null);
    socket.emit("openChannelById", { auth, payload: channelId });
  }

  /**
   * Create a new group chat with the given name and member usernames
   */
  function handleCreateGroup(groupName: string, memberIds: string[]) {
    setError(null);
    socket.emit("createGroupChat", { auth, payload: { groupName, memberIds } });
  }

  /**
   * Send text to the currently active channel
   */
  function handleSendMessage(content: string) {
    if (!activeChannelId) return;
    socket.emit("sendChatMessage", {
      auth,
      payload: { channelId: activeChannelId, content },
    });
  }

  /**
   * Search for users by username/display name to start a new chat with (same as friends)
   */
  function handleSearchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    socket.emit("friendSearch", { auth, payload: { query, type: "all" } });
  }

  return {
    user,
    channels,
    activeChannelId,
    messages,
    error,
    searchResults,
    handleOpenDirectChat,
    handleSelectChannel,
    handleCreateGroup,
    handleSendMessage,
    handleSearchUsers,
  };
}

import "./DmControl.css";
import { useState, useRef, useEffect } from "react";
import useSocketsForGlobalChat from "../hooks/useSocketsForGlobalChat.ts";
import useTimeSince from "../hooks/useTimeSince.ts";

export default function DMControlPanel() {
  const formatTimeSince = useTimeSince();
  const [textInput, setTextInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
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
  } = useSocketsForGlobalChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // search usernames the same way friends do
  useEffect(() => {
    const timer = setTimeout(() => handleSearchUsers(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput, handleSearchUsers]);

  // Start a DM with a chosen user and reset the search box
  const startDmWith = (username: string) => {
    handleOpenDirectChat(username);
    setSearchInput("");
  };

  const handleStartDM = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    startDmWith(searchInput.trim());
  };

  const handleStartGroup = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const members = groupMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    if (!groupName.trim() || members.length === 0) return;
    handleCreateGroup(groupName.trim(), members);
    setGroupName("");
    setGroupMembers("");
    setShowGroupForm(false);
  };

  const handleFormSubmitMessage = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleSendMessage(textInput.trim());
    setTextInput("");
  };

  return (
    <div className="profile-layout dm-panel-wrapper">
      {/* Active Channels List */}
      <div className="profile-left-panel chat-sidebar">
        <h3 className="profile-section-title">Conversations</h3>
        <div className="channels-pill-list">
          {channels.map((chan) => {
            const isSelected = activeChannelId === chan.channelId;
            const fallbackLabel = chan.memberIds.find((id) => id !== user.username) || "User";
            return (
              <button
                key={chan.channelId}
                className={`channel-pill-item ${isSelected ? "active-channel" : ""}`}
                onClick={() => handleSelectChannel(chan.channelId)}
              >
                {chan.isGroup ? `👥 ${chan.name}` : `👤 ${fallbackLabel}`}
              </button>
            );
          })}
        </div>

        {error && <div className="dm-error-banner">{error}</div>}

        {/* Search for a user to start a new chat with */}
        <form onSubmit={handleStartDM} className="new-dm-footer">
          <input
            type="text"
            placeholder="Search users to message..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="action-pill-btn">
            Chat
          </button>
        </form>
        {searchInput.trim() && (
          <div className="dm-search-results">
            {searchResults.length === 0 ? (
              <p className="smallAndGray">No users found.</p>
            ) : (
              searchResults
                .filter((r) => r.username !== user.username)
                .map((r) => (
                  <button
                    key={r.userId}
                    type="button"
                    className="dm-search-result-item"
                    onClick={() => startDmWith(r.username)}
                  >
                    <span className="dm-search-display">{r.display}</span>
                    <span className="smallAndGray">@{r.username}</span>
                  </button>
                ))
            )}
          </div>
        )}

        {/* Group chat creation */}
        <button
          type="button"
          className="action-pill-btn group-toggle-btn"
          onClick={() => setShowGroupForm((prev) => !prev)}
        >
          {showGroupForm ? "Cancel" : "+ New Group"}
        </button>
        {showGroupForm && (
          <form onSubmit={handleStartGroup} className="new-group-footer">
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Members (comma-separated usernames)..."
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
            />
            <button type="submit" className="action-pill-btn">
              Create Group
            </button>
          </form>
        )}
      </div>

      <div className="profile-right-panel chat-viewport">
        {activeChannelId ? (
          <div className="chat-stream-container">
            <div className="dottedList message-bubbles-box">
              {messages.map(({ messageId, content, senderId, timestamp }) => {
                const isMe = senderId === user.username;
                return (
                  <div
                    key={messageId}
                    className={`dottedListItem chat-bubble-item ${isMe ? "msg-right" : "msg-left"}`}
                  >
                    <div className="bubble-content">
                      <div className="message-text">{content}</div>
                      <div className="smallAndGray">
                        {isMe ? "You" : senderId} • {formatTimeSince(new Date(timestamp))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleFormSubmitMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder="Type your message..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <button type="submit" className="action-pill-btn">
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="chat-fallback-empty">
            <h3>No Active Conversation Selected</h3>
            <p className="smallAndGray">
              Choose a thread from the sidebar or initialize a new user session link below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

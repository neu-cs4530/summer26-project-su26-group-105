import "./DmControl.css";
import { useState, useRef, useEffect } from "react";
import useSocketsForGlobalChat from "../hooks/useSocketsForGlobalChat.ts";
import useTimeSince from "../hooks/useTimeSince.ts";

/**
 * Adds DM and Groupchat functionality that will be part of the Messaging page
 * @returns The DMs interface UI
 */
export default function DMControlPanel() {
  const formatTimeSince = useTimeSince();
  const [textInput, setTextInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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

  // The active conversation, used to show its name/members in the header.
  const activeChannel = channels.find((c) => c.channelId === activeChannelId);

  // Toggle between the group-creation form and the start-a-DM search, clearing
  // any in-progress search/selection so the two modes don't bleed together.
  const toggleGroupForm = () => {
    setShowGroupForm((prev) => !prev);
    setSearchInput("");
    setGroupName("");
    setSelectedMembers([]);
  };

  // Start a DM with a chosen user and reset the search box
  const startDmWith = (username: string) => {
    handleOpenDirectChat(username);
    setSearchInput("");
  };

  // Add one user to the in-progress group, then clear the search to add the next
  const addGroupMember = (username: string) => {
    setSelectedMembers((prev) => (prev.includes(username) ? prev : [...prev, username]));
    setSearchInput("");
  };

  const removeGroupMember = (username: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m !== username));
  };

  // Clicking a search result either starts a DM or adds a group member
  const handleResultClick = (username: string) => {
    if (showGroupForm) addGroupMember(username);
    else startDmWith(username);
  };

  const handleStartDM = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    startDmWith(searchInput.trim());
  };

  const handleStartGroup = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    handleCreateGroup(groupName.trim(), selectedMembers);
    setGroupName("");
    setSelectedMembers([]);
    setSearchInput("");
    setShowGroupForm(false);
  };

  const handleFormSubmitMessage = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleSendMessage(textInput.trim());
    setTextInput("");
  };

  // Shared search-results list. Clicking a result starts a DM or adds a group
  // member depending on the current mode. Hides yourself and already-picked members
  const renderSearchResults = () => {
    if (!searchInput.trim()) return null;
    const filtered = searchResults.filter(
      (r) =>
        r.user.username !== user.username &&
        !(showGroupForm && selectedMembers.includes(r.user.username)),
    );
    return (
      <div className="dm-search-results">
        {filtered.length === 0 ? (
          <p className="smallAndGray">No users found.</p>
        ) : (
          filtered.map((r) => (
            <button
              key={r.userId}
              type="button"
              className="dm-search-result-item"
              onClick={() => handleResultClick(r.user.username)}
            >
              <span className="dm-search-display">{r.user.display}</span>
              <span className="smallAndGray">@{r.user.username}</span>
            </button>
          ))
        )}
      </div>
    );
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

        {/* Start a new DM*/}
        {!showGroupForm && (
          <>
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
            {renderSearchResults()}
          </>
        )}

        {/* Group chat creation */}
        <button
          type="button"
          className="action-pill-btn group-toggle-btn"
          onClick={toggleGroupForm}
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

            {/* Selected members so far and are removable */}
            {selectedMembers.length > 0 && (
              <div className="group-member-chips">
                {selectedMembers.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="group-member-chip"
                    onClick={() => removeGroupMember(m)}
                    title="Remove"
                  >
                    {m} ✕
                  </button>
                ))}
              </div>
            )}

            {/* Search and add members one at a time */}
            <input
              type="text"
              placeholder="Search users to add..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {renderSearchResults()}

            <button
              type="submit"
              className="action-pill-btn"
              disabled={selectedMembers.length === 0}
            >
              Create Group
            </button>
          </form>
        )}
      </div>

      <div className="profile-right-panel chat-viewport">
        {activeChannelId ? (
          <div className="chat-stream-container">
            {activeChannel && (
              <div className="chat-header">
                <h3 className="chat-header-title">
                  {activeChannel.isGroup
                    ? `👥 ${activeChannel.name}`
                    : `👤 ${activeChannel.memberIds.find((id) => id !== user.username) || "User"}`}
                </h3>
                {activeChannel.isGroup && (
                  <div className="chat-header-members smallAndGray">
                    {activeChannel.memberIds.length} members:{" "}
                    {activeChannel.memberIds
                      .map((m) => (m === user.username ? "You" : m))
                      .join(", ")}
                  </div>
                )}
              </div>
            )}
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
            <h3>No Conversation Selected</h3>
            <p className="smallAndGray">Choose a thread from the sidebar or create a new one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

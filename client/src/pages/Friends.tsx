import { useState, useRef, useEffect } from "react";
import useSocketsForFriends from "../hooks/useSocketsForFriends";
import type { FriendEntry, SearchResult } from "@gamenite/shared/src/friend.types";
import { createPortal } from "react-dom";
import Modal from "../components/Modal";

type Tab = "friends" | "pending" | "search" | "blocked";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return createPortal(
    <Modal close={onCancel}>
      <p style={{ textAlign: "center" }}>{message}</p>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
        <button className="cancel narrow" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary narrow" type="button" onClick={onConfirm}>
          OK
        </button>
      </div>
    </Modal>,
    document.body,
  );
}

interface ThreeDotMenuProps {
  onRemove: () => void;
  onBlock: () => void;
}

function ThreeDotMenu({ onRemove, onBlock }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // for mouse clicking outside popup
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="secondary narrow"
        aria-label="More options"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "0.25rem 0.6 rem", fontSize: "1rem" }}
      >
        ...
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "2rem",
            background: "var(--background, white)",
            border: "1px solid var(--border, #ccc)",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 100,
            minWidth: "150px",
          }}
        >
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.6rem 1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove Friend 🚩
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.6rem 1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--error, #c00)",
            }}
            onClick={() => {
              setOpen(false);
              onBlock();
            }}
          >
            Block User ⚠️
          </button>
        </div>
      )}
    </div>
  );
}

export default function Friends() {
  const {
    friends,
    incoming,
    outgoing,
    blocked,
    searchResults,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    unblockUser,
    searchUsers,
  } = useSocketsForFriends();

  const [tab, setTab] = useState<Tab>("friends");
  const [modal, setModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!["search", "friends"].includes(tab)) return;
    const searchType = tab === "search" ? ("all" as const) : ("existing" as const);
    const timer = setTimeout(() => {
      searchUsers(searchInput, searchType);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, tab, searchUsers]);

  function confirmRemove(f: { display: string; username: string }) {
    setModal({
      message: `Warning! You are about to remove ${f.display} (@${f.username}) as a friend.
                    To befriend them again, a new request would be necessary. Click OK if you wish to proceed.`,
      onConfirm: () => {
        removeFriend(f.username);
        setModal(null);
      },
    });
  }

  function confirmBlock(f: { display: string; username: string }) {
    setModal({
      message: `Warning! Blocking ${f.display} (@${f.username}) means you can no longer view
                    each other's profiles or play together. Click OK if you wish to proceed.`,
      onConfirm: () => {
        blockUser(f.username);
        setModal(null);
      },
    });
  }

  function confirmUnblock(f: FriendEntry) {
    setModal({
      message: `Are you sure you want to unblock ${f.display} (@${f.username})? They will be
                    able to find you and send you a friend request again.`,
      onConfirm: () => {
        unblockUser(f.username);
        setModal(null);
      },
    });
  }

  function relationshipLabel(relationship: SearchResult["relationship"]) {
    if (relationship === "friend") return <span className="smallAndGray"> · Already friends</span>;
    if (relationship === "incoming")
      return <span className="smallAndGray"> · Request received</span>;
    if (relationship === "outgoing") return <span className="smallAndGray"> · Request sent</span>;
    return null;
  }

  const friendsTabFriends = searchInput.length ? searchResults : friends;

  return (
    <div className="content spacedSection">
      {modal && (
        <ConfirmModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <h2>Friends</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          className={tab === "friends" ? "primary narrow" : "secondary narrow"}
          onClick={() => setTab("friends")}
        >
          Friends {friends.length > 0 && `(${friends.length})`}
        </button>
        <button
          className={tab === "pending" ? "primary narrow" : "secondary narrow"}
          onClick={() => setTab("pending")}
        >
          Pending {incoming.length > 0 && `(${incoming.length})`}
        </button>
        <button
          className={tab === "search" ? "primary narrow" : "secondary narrow"}
          onClick={() => setTab("search")}
        >
          Add Friend
        </button>
        <button
          className={tab === "blocked" ? "primary narrow" : "secondary narrow"}
          onClick={() => setTab("blocked")}
        >
          Blocked {blocked.length > 0 && `(${blocked.length})`}
        </button>
      </div>

      <hr />

      {tab === "friends" && (
        <div className="spacedSection">
          <input
            className="widefill notTooWide"
            placeholder="Search by username or display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
          />
          {friendsTabFriends.length === 0 ? (
            <p className="smallAndGray">No friends yet. Use the Add Friend tab to get started!</p>
          ) : (
            <>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {friendsTabFriends.map((f: FriendEntry | SearchResult) => (
                  <li
                    key={f.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {f.display} <span className="smallAndGray">@{f.username}</span>
                    </span>
                    <ThreeDotMenu
                      onRemove={() => confirmRemove(f)}
                      onBlock={() => confirmBlock(f)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "pending" && (
        <div className="spacedSection">
          {incoming.length > 0 && (
            <>
              <h3>Incoming</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {incoming.map((f: FriendEntry) => (
                  <li
                    key={f.friendId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {f.display} <span className="smallAndGray">@{f.username}</span>
                    </span>
                    <button className="primary narrow" onClick={() => acceptRequest(f.friendId)}>
                      Accept
                    </button>
                    <button className="secondary narrow" onClick={() => declineRequest(f.friendId)}>
                      Decline
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {outgoing.length > 0 && (
            <>
              <h3>Sent</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {outgoing.map((f: FriendEntry) => (
                  <li
                    key={f.friendId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {f.display} <span className="smallAndGray">@{f.username}</span>
                    </span>
                    <span className="smallAndGray">Pending...</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <p className="smallAndGray">No pending requests.</p>
          )}
        </div>
      )}

      {tab === "search" && (
        <div className="spacedSection">
          <h3>Find Players</h3>
          <input
            className="widefill notTooWide"
            placeholder="Search by username or display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
          />
          {searchInput.trim() && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
              {searchResults.length === 0 ? (
                <li>
                  <p className="smallAndGray">No players found.</p>
                </li>
              ) : (
                searchResults.map((r: SearchResult) => (
                  <li
                    key={r.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {r.display} <span className="smallAndGray">@{r.username}</span>
                      {relationshipLabel(r.relationship)}
                    </span>
                    {r.relationship === "none" && (
                      <button className="primary narrow" onClick={() => sendRequest(r.username)}>
                        Add Friend
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {tab === "blocked" && (
        <div className="spacedSection">
          {blocked.length === 0 ? (
            <p className="smallAndGray">You haven't blocked anyone.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {blocked.map((f: FriendEntry) => (
                <li
                  key={f.friendId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ flex: 1 }} className="smallAndGray">
                    @{f.username}
                  </span>
                  <button className="secondary narrow" onClick={() => confirmUnblock(f)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

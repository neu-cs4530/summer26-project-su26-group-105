import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import useSocketsForFriends from "../hooks/useSocketsForFriends";
import type { FriendEntry, SearchResult } from "@gamenite/shared/src/friend.types";
import Modal from "../components/Modal";
import ProfileImage from "../components/ProfileImage";
import "./Friends.css";
import DisplayName from "../components/DisplayName";

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
    <div ref={ref} className="friendsMenuWrapper">
      <button
        className="secondary narrow"
        aria-label="More options"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "0.25rem 0.75rem" }}
      >
        •••
      </button>
      {open && (
        <div className="friendsMenuDropdown">
          <button
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove Friend 🚩
          </button>
          <button
            className="danger"
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

  function confirmRemove(f: FriendEntry) {
    setModal({
      message: `Warning! You are about to remove ${f.user.display} (@${f.user.username}) as a friend.
                    To befriend them again, a new request would be necessary. Click OK if you wish to proceed.`,
      onConfirm: () => {
        removeFriend(f.friendId);
        setModal(null);
      },
    });
  }

  function confirmBlock(f: FriendEntry) {
    setModal({
      message: `Warning! Blocking ${f.user.display} (@${f.user.username}) means you can no longer view
                    each other's profiles or play together. Click OK if you wish to proceed.`,
      onConfirm: () => {
        blockUser(f.user.username);
        setModal(null);
      },
    });
  }

  function confirmUnblock(f: FriendEntry) {
    setModal({
      message: `Are you sure you want to unblock ${f.user.display} (@${f.user.username})? They will be
                    able to find you and send you a friend request again.`,
      onConfirm: () => {
        unblockUser(f.user.username);
        setModal(null);
      },
    });
  }

  function relationshipLabel(relationship: SearchResult["relationship"]) {
    if (relationship === "friend") return <span className="friendsRelBadge">Already friends</span>;
    if (relationship === "incoming")
      return <span className="friendsRelBadge">Request received</span>;
    if (relationship === "outgoing") return <span className="friendsRelBadge">Request sent</span>;
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

      <div className="friendsTabBar">
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

      {tab === "friends" && (
        <>
          <input
            className="friendsSearchBar"
            placeholder="Search friends by username or display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
          />
          {friendsTabFriends.length === 0 ? (
            <div className="friendsEmpty">
              <p>
                No friends yet. Use the <strong>Add Friend</strong> tab to get started!
              </p>
            </div>
          ) : (
            <table className="friendsTable">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {friendsTabFriends.map((f: FriendEntry | SearchResult<true>) => (
                  <tr key={f.userId}>
                    <td>
                      <DisplayName user={f.user} showFullInfo />
                    </td>
                    <td>
                      {"activityStatus" in f && f.activityStatus ? (
                        <span className="friendsRelBadge">{f.activityStatus}</span>
                      ) : null}
                    </td>
                    <td className="friendsActions">
                      <ThreeDotMenu
                        onRemove={() => confirmRemove(f as FriendEntry)}
                        onBlock={() => confirmBlock(f as FriendEntry)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === "pending" && (
        <>
          {incoming.length > 0 && (
            <>
              <p className="friendsSectionTitle">Incoming Requests</p>
              <table className="friendsTable" style={{ marginBottom: "24px" }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {incoming.map((f: FriendEntry) => (
                    <tr key={f.friendId}>
                      <td>
                        <DisplayName user={f.user} showFullInfo />
                      </td>
                      <td className="friendsActions">
                        <button
                          className="primary narrow"
                          onClick={() => acceptRequest(f.friendId)}
                        >
                          Accept
                        </button>
                        <button
                          className="secondary narrow"
                          style={{ marginLeft: "8px" }}
                          onClick={() => declineRequest(f.friendId)}
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {outgoing.length > 0 && (
            <>
              <p className="friendsSectionTitle">Sent Requests</p>
              <table className="friendsTable">
                <thead>
                  <tr>
                    <th>User</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {outgoing.map((f: FriendEntry) => (
                    <tr key={f.friendId}>
                      <td>
                        <DisplayName user={f.user} showFullInfo />
                      </td>
                      <td className="friendsActions">
                        <span className="friendsRelBadge">Pending...</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="friendsEmpty">
              <p>No pending requests.</p>
            </div>
          )}
        </>
      )}

      {tab === "search" && (
        <>
          <input
            className="friendsSearchBar"
            placeholder="Search by username or display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoFocus
          />
          {searchInput.trim() &&
            (searchResults.length === 0 ? (
              <div className="friendsEmpty">
                <p>No players found.</p>
              </div>
            ) : (
              <table className="friendsTable">
                <thead>
                  <tr>
                    <th>User</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((r: SearchResult) => (
                    <tr key={r.userId}>
                      <td>
                        <Link
                          to={`/profile/${r.user.username}`}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          {r.user.display}
                          <span style={{ color: "var(--muted-text)", fontSize: "0.85rem" }}>
                            @{r.user.username}
                          </span>
                        </Link>
                        {relationshipLabel(r.relationship)}
                      </td>
                      <td className="friendsActions">
                        {r.relationship === "none" && (
                          <button
                            className="primary narrow"
                            onClick={() => sendRequest(r.user.username)}
                          >
                            Add Friend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </>
      )}

      {tab === "blocked" &&
        (blocked.length === 0 ? (
          <div className="friendsEmpty">
            <p>You haven't blocked anyone.</p>
          </div>
        ) : (
          <table className="friendsTable">
            <thead>
              <tr>
                <th>User</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((f: FriendEntry) => (
                <tr key={f.friendId}>
                  <td style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ProfileImage src={null} size="small" blocked decorations={[]} />
                    <span style={{ color: "var(--muted-text)" }}>@{f.user.username}</span>
                  </td>
                  <td className="friendsActions">
                    <button className="secondary narrow" onClick={() => confirmUnblock(f)}>
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </div>
  );
}

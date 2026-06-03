import { useState, useRef, useEffect } from "react";
import useSocketsForFriends from "../hooks/useSocketsForFriends";
import type { FriendEntry } from "@gamenite/shared/src/friend.types";

type Tab = "friends" | "pending" | "blocked";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--background, white)",
          padding: "1.5rem",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ marginBottom: "1.25rem" }}>{message}</p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button className="secondary narrow" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary narrow" onClick={onConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
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
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useSocketsForFriends();

  const [tab, setTab] = useState<Tab>("friends");
  const [modal, setModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  function confirmRemove(f: FriendEntry) {
    setModal({
      message: `Warning! You are about to remove ${f.display} (@${f.username}) as a friend.
                    To befriend them again, a new request would be necessary. Click OK if you wish to proceed.`,
      onConfirm: () => {
        removeFriend(f.username);
        setModal(null);
      },
    });
  }

  function confirmBlock(f: FriendEntry) {
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
}

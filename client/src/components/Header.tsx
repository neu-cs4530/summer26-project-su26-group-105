import { useState, useRef, useEffect } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import ProfileImage from "./ProfileImage.tsx";
import type { ActivityStatus } from "@gamenite/shared/src/friend.types.ts";
import { WEBSITE_NAME } from "../util/consts.ts";

// activity status icons
const STATUS_OPTIONS: { value: ActivityStatus; label: string; description: string }[] = [
  { value: "online", label: "🟢 Online", description: "Appear online to friends" },
  { value: "idle", label: "🌙 Idle", description: "Appear idle" },
  { value: "dnd", label: "⛔ Do Not Disturb", description: "Mute notifications" },
  { value: "offline", label: "⚫ Appear Offline", description: "Hidden from friends" },
];

/**
 * Header component that renders the main title.
 */
export default function Header() {
  const { user, socket, pass, reset } = useLoginContext();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ActivityStatus>("online");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSetStatus(newStatus: ActivityStatus) {
    setStatus(newStatus);
    setMenuOpen(false);
    socket.emit("setStatus", {
      auth: { username: user.username, password: pass },
      payload: { status: newStatus },
    });
  }

  return (
    <div id="header" className="header">
      <div className="title">{WEBSITE_NAME}💤</div>

      <span className="header-user">
        signed in as {/* Clickable avatar with status dot, opens activity status picker */}
        <div ref={menuRef} className="header-avatar-wrapper">
          <button
            className="header-avatar-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Set activity status"
            title="Set activity status"
          >
            <ProfileImage
              src={user.image}
              decorations={user.decorations}
              size="small"
              activityStatus={status}
            />
          </button>

          {menuOpen && (
            <div className="status-menu">
              <p className="status-menu-title">Set Status</p>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`status-menu-item ${status === opt.value ? "status-menu-item--active" : ""}`}
                  onClick={() => handleSetStatus(opt.value)}
                >
                  <span className="status-menu-label">{opt.label}</span>
                  <span className="status-menu-desc">{opt.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {user.display}
      </span>

      <button
        className="narrowcenter secondary"
        onClick={async () => {
          reset();
          await navigate("/login");
        }}
      >
        Log Out
      </button>
      <button
        className="narrowcenter secondary"
        onClick={() => navigate(`/profile/${user.username}`)}
      >
        View Profile
      </button>
    </div>
  );
}

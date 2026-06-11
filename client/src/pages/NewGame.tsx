import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

export default function NewGame() {
  const { gameKey, friendOnly, handleInputChange, toggleFriendOnly, err, handleSubmit } =
    useNewGameForm();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2>Create new game</h2>
      <div>
        <select value={gameKey} aria-label="Game selection" onChange={(e) => handleInputChange(e)}>
          <option value="">— Select a game —</option>
          {Object.entries(gameNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
        <span>Friends only</span>
        <button
          type="button"
          role="switch"
          aria-checked={friendOnly}
          onClick={toggleFriendOnly}
          style={{
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            padding: 0,
            position: "relative",
            background: friendOnly ? "var(--primary, #4f6ef7)" : "var(--gray, #ccc)",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: friendOnly ? "23px" : "3px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "white",
              transition: "left 0.2s",
            }}
          />
        </button>
        <span className="smallAndGray">
          {friendOnly ? "Only your friends can join" : "Anyone can join"}
        </span>
      </div>
      {err && <p className="error-message">{err}</p>}
      <div>
        <button className="primary narrow">Create New Game</button>
      </div>
    </form>
  );
}

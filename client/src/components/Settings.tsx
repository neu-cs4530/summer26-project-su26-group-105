import { useState } from "react";
import useEditProfileForm from "../hooks/profile/useEditProfileForm";
import FriendNotificationSettings from "./FriendNotificationSettings";
import TextInput from "./TextInput";
import Loading from "./Loading";
import "../pages/Profile.css";
import "./profile/EditableProfile.css";
import type { BackgroundMusicTrack } from "@gamenite/shared";

export type ThemeMode = "light" | "dark";

/**
 * Shows private account settings for the current user.
 * This includes password settings and notification settings.
 * @returns the settings page UI
 */
export default function Settings() {
  const [showPass, setShowPass] = useState(false);
  //keeps track of current theme
  const [theme, setTheme] = useState<ThemeMode>(() => {
    //gets the saved theme from browser to keep it regardless
    //if page is refreshed
    const savedTheme = localStorage.getItem("theme");

    //if theme is valid, then use it
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    //default to light
    return "light";
  });

  const {
    password,
    setPassword,
    confirm,
    setConfirm,
    backgroundMusic,
    backgroundMusicVolume,
    isLoading,
    isSaved,
    err,
    validationErrors,
    handlePasswordSubmit,
    handleBackgroundMusicChange,
    handleBackgroundMusicVolumeChange,
  } = useEditProfileForm();

  //updates the theme when the user clicks one of the theme buttons
  const handleThemeChange = (newTheme: ThemeMode) => {
    //update react and save theme to browser
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  //the music that the player can play in the background
  const musicOptions: { value: BackgroundMusicTrack; label: string }[] = [
    { value: "off", label: "Off" },
    { value: "lofi", label: "Lo-fi" },
    { value: "arcade", label: "Arcade" },
    { value: "sleepy", label: "Sleepy" },
  ];

  return (
    <div className="profile-settings">
      <h1>App Settings</h1>
      <hr />
      <div className="content spacedSection">
        <h2 style={{ textAlign: "center" }}>Theme</h2>

        {/* light and dark mode */}
        <div className="theme-toggle-row">
          <button
            className={theme === "light" ? "primary narrow" : "secondary narrow"}
            type="button"
            onClick={() => handleThemeChange("light")}
          >
            Light Mode
          </button>

          <button
            className={theme === "dark" ? "primary narrow" : "secondary narrow"}
            type="button"
            onClick={() => handleThemeChange("dark")}
          >
            Dark Mode
          </button>
        </div>
      </div>
      <hr />
      <div className="content spacedSection">
        <h2 style={{ textAlign: "center" }}>Background Music</h2>

        {/* the background music buttons*/}
        <div className="theme-toggle-row">
          {musicOptions.map((option) => (
            <button
              key={option.value}
              className={backgroundMusic === option.value ? "primary narrow" : "secondary narrow"}
              type="button"
              onClick={() => handleBackgroundMusicChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {/* volume adjustment  */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "1rem",
          }}
        >
          <label htmlFor="background-music-volume" style={{ fontWeight: 600, textAlign: "center" }}>
            Volume
          </label>
          <input
            id="background-music-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={backgroundMusicVolume}
            onChange={(e) => handleBackgroundMusicVolumeChange(Number(e.target.value))}
            style={{
              width: "220px",
              maxWidth: "80%",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
      <hr />
      <div className="content spacedSection">
        <h2 style={{ textAlign: "center" }}>Notification</h2>
        <h3>Friend Notifications</h3>
        <FriendNotificationSettings />
      </div>
      <hr />
      {/* Password Form */}
      <form className="content spacedSection" onSubmit={handlePasswordSubmit}>
        <h2 style={{ textAlign: "center" }}>Reset Password</h2>

        <div className="account-settings">
          <TextInput
            label="New Password"
            type={showPass ? "input" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="widefill notTooWide"
            containerClassName="setting"
            error={validationErrors?.properties?.password?.errors?.[0]}
            buttons={
              <>
                <button
                  className="secondary small"
                  type="button"
                  onClick={() => {
                    setPassword("");
                    setConfirm("");
                  }}
                >
                  Reset
                </button>
                <button
                  className="secondary small"
                  aria-label="Toggle show password"
                  type="button"
                  onClick={() => {
                    setShowPass((v) => !v);
                  }}
                >
                  {showPass ? "Hide" : "Reveal"}
                </button>
              </>
            }
          />

          <TextInput
            label="Confirm New Password"
            type={showPass ? "input" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="widefill notTooWide"
            containerClassName="setting"
            error={validationErrors?.properties?.confirm?.errors?.[0]}
          />
        </div>

        {err && <p className="error-message">{err}</p>}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="primary narrow"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            disabled={isLoading}
          >
            {isLoading && <Loading />}
            {isSaved ? "Password Saved" : "Save Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

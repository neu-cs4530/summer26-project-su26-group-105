import { useState } from "react";
import useEditProfileForm from "../hooks/profile/useEditProfileForm";
import FriendNotificationSettings from "./FriendNotificationSettings";
import TextInput from "./TextInput";
import Loading from "./Loading";
import "../pages/Profile.css";
import "./profile/EditableProfile.css";

/**
 * Shows private account settings for the current user.
 * This includes password settings and notification settings.
 * @returns the settings page UI
 */
export default function Settings() {
  const [showPass, setShowPass] = useState(false);

  const {
    password,
    setPassword,
    confirm,
    setConfirm,
    isLoading,
    isSaved,
    err,
    validationErrors,
    handlePasswordSubmit,
  } = useEditProfileForm();

  return (
    <div className="profile-settings">
      <h1>App Settings</h1>
      <hr />
      <div className="content spacedSection">
        <h2 style={{ textAlign: "center" }}>Notification Settings</h2>
        <h3>Friend Notifications</h3>
        <FriendNotificationSettings />
      </div>
      <hr />
      {/* Password Form */}
      <form className="content spacedSection" onSubmit={handlePasswordSubmit}>
        <h2 style={{ textAlign: "center" }}>Password Settings</h2>

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

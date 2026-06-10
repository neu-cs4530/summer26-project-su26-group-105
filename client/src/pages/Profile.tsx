import { useParams } from "react-router-dom";
import EditableProfile from "../components/profile/EditableProfile.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";
import ViewableProfile from "../components/profile/ViewableProfile.tsx";
import { useState } from "react";
import Settings from "../components/Settings.tsx";
import "./Profile.css";

/**
 * Displays either the editable profile page or a read only page.
 * If the user is seeing their own profile, can also switch between
 * the profile and a settings tab
 * @returns the profile page UI
 */
export default function Profile() {
  const { user } = useLoginContext();
  const { username } = useParams();
  //tracks which tab the user has open currently
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");

  // if not your profile, can only view a viewable profile
  if (user.username !== username) {
    return <ViewableProfile username={username || ""} />;
  }

  //If user is viewing their own profile, shows the tab so that they
  // can switch between their profile or settings
  return (
    <div className="profile-page">
      <div className="profile-tabs">
        {/* Tab buttons that let you switch */}
        <button
          className={activeTab === "profile" ? "active-tab" : ""}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>

        <button
          className={activeTab === "settings" ? "active-tab" : ""}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {/* Shows the editabl profile when profile tab is selected */}
      {activeTab === "profile" && <EditableProfile />}

      {/* Shows the settings page when settings tab is selected */}
      {activeTab === "settings" && <Settings />}
    </div>
  );
}

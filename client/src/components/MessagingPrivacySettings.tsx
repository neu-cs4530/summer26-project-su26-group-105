import { useState } from "react";
import useLoginContext from "../hooks/useLoginContext";
import type { MessagePrivacySetting } from "../../../shared/src/dms.types.ts";
import "./FriendNotificationSettings.css";

const OPTIONS: { value: MessagePrivacySetting; label: string; description: string }[] = [
  {
    value: "anyone",
    label: "Anyone",
    description: "Any user can start a direct message conversation with you.",
  },
  {
    value: "friends_only",
    label: "Friends Only",
    description: "Only people on your friends list can message you.",
  },
  {
    value: "no_one",
    label: "No One",
    description: "Direct messaging is turned off — no one can message you.",
  },
];

/**
 * A small toggle that controls who is allowed to start a direct message with the
 * current user (anyone / friends only / no one).
 * @returns the messaging privacy settings UI
 */
export default function MessagingPrivacySettings() {
  const { user, update } = useLoginContext();
  const current = user.settings.allowMessagesFrom;
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Persists a new messaging-permission choice for the current user.
   * @param value the new permission level
   */
  async function handleSelect(value: MessagePrivacySetting) {
    if (value === current || isSaving) return;
    setIsSaving(true);
    try {
      await update({ settings: { allowMessagesFrom: value } });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="messaging-privacy-settings">
      <p>Choose who is allowed to send you direct messages.</p>
      <div className="messaging-privacy-toggle">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={current === option.value ? "primary narrow" : "secondary narrow"}
            disabled={isSaving}
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="smallAndGray">
        {OPTIONS.find((option) => option.value === current)?.description}
      </p>
    </div>
  );
}

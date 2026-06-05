import { createPortal } from "react-dom";
import Modal from "../Modal";
import TextInput from "../TextInput";
import useSocialMediaModal from "../../hooks/profile/useSocialMediaModal";
import type { SocialMedia } from "@gamenite/shared";

type SocialMediaModalProps = {
  save: (socialMedia: SocialMedia) => void;
  close: () => void;
};

/**
 * Modal for adding a new social media link. Uses `useSocialMediaModal` to manage state and validation.
 *
 * @param save to confirm the new social media link
 * @param close to close the modal
 */
export default function SocialMediaModal({ save, close }: SocialMediaModalProps) {
  const { link, setLink, username, setUsername, confirm, reset, validationErrors } =
    useSocialMediaModal(save, close);

  return createPortal(
    <Modal close={close}>
      <h3>Add New Social Media</h3>
      <TextInput
        label="Link"
        type="text"
        placeholder="Link to social media profile"
        className="widefill notTooWide"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        error={validationErrors?.properties?.link?.errors?.[0]}
      />
      <TextInput
        label="Username"
        type="text"
        placeholder="Username on that platform"
        className="widefill notTooWide"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={validationErrors?.properties?.username?.errors?.[0]}
      />
      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
        <button className="cancel narrow" type="button" onClick={reset}>
          Cancel
        </button>
        <button className="primary narrow" type="button" onClick={confirm}>
          Add
        </button>
      </div>
    </Modal>,
    document.body,
  );
}

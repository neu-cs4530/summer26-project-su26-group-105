import { createPortal } from "react-dom";
import type useEditProfileForm from "../../hooks/useEditProfileForm";
import Modal from "../Modal";
import TextInput from "../TextInput";

type SocialMediaModalProps = ReturnType<typeof useEditProfileForm>["socialMediaModal"];

export default function SocialMediaModal({
  isVisible,
  close,
  link,
  username,
  setLink,
  setUsername,
  confirm,
  validationErrors,
}: SocialMediaModalProps) {
  if (!isVisible) return null;

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
        <button className="cancel narrow" type="button" onClick={close}>
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

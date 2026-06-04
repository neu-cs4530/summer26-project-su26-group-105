import { createPortal } from "react-dom";
import Modal from "../Modal";
import useImageModal from "../../hooks/profile/useImageModal";
import TextInput from "../TextInput";
import ProfileImage from "../ProfileImage";

type ImageModalProps = {
  close: () => void;
  currentImage: string | null;
  save: (img: string | null) => void;
};

export default function ImageModal({ close, currentImage, save }: ImageModalProps) {
  const { image, setImage, confirm, reset, validationErrors } = useImageModal(
    currentImage,
    save,
    close,
  );

  return createPortal(
    <Modal close={close}>
      <h3>Change Profile Picture</h3>
      <ProfileImage src={image} size="large" />
      <TextInput
        label="Image URL"
        type="text"
        placeholder="Link to profile picture"
        className="widefill notTooWide"
        value={image ?? ""}
        onChange={(e) => setImage(e.target.value)}
        error={validationErrors?.errors?.[0]}
      />
      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
        <button className="cancel narrow" type="button" onClick={reset}>
          Cancel
        </button>
        <button className="primary narrow" type="button" onClick={confirm}>
          Confirm
        </button>
      </div>
    </Modal>,
    document.body,
  );
}

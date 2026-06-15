import { createPortal } from "react-dom";
import Modal from "../Modal";
import useImageModal from "../../hooks/profile/useImageModal";
import TextInput from "../TextInput";
import { RawProfileImage } from "../ProfileImage";
import AvatarDecoration, { avatarDecorations } from "../AvatarDecoration";
import type { AvatarDecoration as AvatarDecorationType, AvatarDecorations } from "@gamenite/shared";

type ImageModalProps = {
  close: () => void;
  currentImage: string | null;
  currentDecorations: AvatarDecorationType[];
  save: (img: string | null, decorations: AvatarDecorationType[]) => void;
};

/**
 * Modal for changing profile picture. Uses `useImageModal` to manage state and validation.
 * @param close Function to close the modal
 * @param currentImage The user's current profile image URL (or null if none)
 * @param save Function to confirm the new profile image URL
 */
export default function ImageModal({
  close,
  currentImage,
  currentDecorations,
  save,
}: ImageModalProps) {
  const { image, setImage, decorations, setDecorations, confirm, reset, validationErrors } =
    useImageModal(currentImage, currentDecorations, save, close);

  const handleDecorationDrag = (id: number, x: number, y: number) => {
    // Moves the decoration with the given id to the new x and y coordinates, and pushes it
    // to the foreground
    setDecorations((prev) => [
      ...prev.filter((decoration) => decoration.id !== id),
      { ...prev.find(({ id: dId }) => id === dId)!, x, y },
    ]);
  };

  const handleDecorationRemove = (id: number) => {
    setDecorations((prev) => prev.filter((decoration) => decoration.id !== id));
  };

  const handleDecorationRotate = (id: number, rotation: number) => {
    setDecorations((prev) =>
      prev.map((decoration) => (decoration.id === id ? { ...decoration, rotation } : decoration)),
    );
  };

  const addDecoration = (type: AvatarDecorations) => {
    setDecorations((prev) => [
      ...prev,
      { id: prev.reduce((c, d) => Math.max(c, d.id + 1), 0), type, x: 50, y: 50, rotation: 0 },
    ]);
  };

  return createPortal(
    <Modal close={close}>
      <h3>Change Profile Picture</h3>
      <div style={{ border: "1px solid var(--border-color)", borderRadius: "1rem" }}>
        <RawProfileImage src={image} size="large">
          {decorations.map((decoration) => (
            <AvatarDecoration
              key={decoration.id}
              decoration={decoration}
              onDrag={handleDecorationDrag}
              onRotate={handleDecorationRotate}
              onRemove={handleDecorationRemove}
            />
          ))}
        </RawProfileImage>
      </div>
      <div>
        {Object.entries(avatarDecorations).map(([name, decoration]) => (
          <button
            type="button"
            key={name}
            style={{
              width: "2rem",
              aspectRatio: 1,
              background: "var(--gray-foreground)",
              outline: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "0.25rem",
            }}
            onClick={() => addDecoration(name as AvatarDecorations)}
          >
            <img src={decoration.image} />
          </button>
        ))}
      </div>
      <button
        type="button"
        style={{
          background: "var(--gray-foreground)",
          color: "var(--gray-background)",
          border: "1px solid var(--border-color)",
          borderRadius: "0.25rem",
        }}
        onClick={() => setDecorations([])}
      >
        Clear Decorations
      </button>
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

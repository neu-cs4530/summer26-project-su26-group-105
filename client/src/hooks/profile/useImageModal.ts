import { zUserUpdateRequest } from "@gamenite/shared";
import { useState } from "react";
import { z, type ZodError } from "zod";

const zImage = zUserUpdateRequest.shape.image.unwrap();
type Image = z.infer<typeof zImage>;

/**
 * Custom hook to manage the image modal logic
 * @param existingImage - The current image URL or null
 * @param save - Function to save the updated image
 * @param close - Function to close the modal
 * @returns an object containing the image state and related functions
 *  - `image`: the current image URL or null
 *  - `setImage`: function to update the image state
 *  - `validationErrors`: any validation errors from the zod schema
 *  - `confirm`: function to validate and save the image, then close the modal
 *  - `reset`: function to clear validation errors and close the modal
 */
export default function useImageModal(
  existingImage: string | null,
  save: (image: string | null) => void,
  close: () => void,
) {
  const [image, setImage] = useState<Image>(existingImage);
  const [validationError, setValidationError] = useState<null | ZodError<Image>>(null);

  const reset = () => {
    setValidationError(null);
    close();
  };

  const confirm = () => {
    const valid = zImage.safeParse(image);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    save(valid.data);
    reset();
  };

  const validationErrors = validationError && z.treeifyError(validationError);

  return {
    image,
    setImage,
    validationErrors,
    confirm,
    reset,
  };
}

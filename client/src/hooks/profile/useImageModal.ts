import { zUserUpdateRequest } from "@gamenite/shared";
import { useState } from "react";
import { z, type ZodError } from "zod";

const zImage = zUserUpdateRequest.shape.image.unwrap();
type Image = z.infer<typeof zImage>;

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

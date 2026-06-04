import { zSocialMedia, type SocialMedia } from "@gamenite/shared";
import { useState } from "react";
import { z, type ZodError } from "zod";

/**
 * Custom hook to manage the social media modal logic
 * @param save - Function to save the updated social media info
 * @param close - Function to close the modal
 * @returns an object containing the social media state and related functions
 *  - `link`: the current social media link
 *  - `username`: the current social media username
 *  - `setLink`: function to update the link state
 *  - `setUsername`: function to update the username state
 *  - `validationErrors`: any validation errors from the zod schema
 *  - `confirm`: function to validate and save the social media info, then close the modal
 *  - `reset`: function to clear validation errors and close the modal
 */
export default function useSocialMediaModal(
  save: (socialMedia: SocialMedia) => void,
  close: () => void,
) {
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({ username: "", link: "" });
  const [validationError, setValidationError] = useState<null | ZodError<SocialMedia>>(null);

  const reset = () => {
    setSocialMedia({ username: "", link: "" });
    setValidationError(null);
    close();
  };

  const confirm = () => {
    const valid = zSocialMedia.safeParse(socialMedia);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    save(valid.data);
    reset();
  };

  const validationErrors = validationError && z.treeifyError(validationError);

  return {
    link: socialMedia.link,
    username: socialMedia.username,
    setLink: (link: string) => setSocialMedia((prev) => ({ ...prev, link })),
    setUsername: (username: string) => setSocialMedia((prev) => ({ ...prev, username })),
    validationErrors,
    confirm,
    reset,
  };
}

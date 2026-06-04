import { zSocialMedia, type SocialMedia } from "@gamenite/shared";
import { useState } from "react";
import { z, type ZodError } from "zod";

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

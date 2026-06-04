import { useState, type SubmitEvent } from "react";
import useLoginContext from "./useLoginContext.ts";
import { zSocialMedia, zUserUpdateRequest, type SocialMedia } from "@gamenite/shared";
import { z, ZodError } from "zod";

const zUpdateForm = zUserUpdateRequest
  .extend({
    confirm: z.preprocess((p) => (p === "" ? undefined : p), z.string().optional()),
  })
  .refine((val) => val.password === val.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })
  .transform((form) => {
    delete form["confirm"];
    return form;
  });

type UpdateForm = z.infer<typeof zUpdateForm>;

/**
 * Custom hook to manage profile form logic
 * @returns an object containing
 *  - Form values `display`, `password`, and `confirm`
 *  - Form setters `setDisplay`, `setPassword`, and `setConfirm`
 *  - Possibly-null error message `err`
 *  - Submission handler `handleSubmit`
 */
export default function useEditProfileForm() {
  const { user, update: updateUser } = useLoginContext();
  const [socialMediaModalVisible, setSocialMediaModalVisible] = useState(false);
  const [newSocialMedia, setNewSocialMedia] = useState<SocialMedia>({ username: "", link: "" });
  const [updatedForm, setUpdatedForm] = useState<UpdateForm>({});
  const [validationError, setValidationError] = useState<null | ZodError<UpdateForm>>(null);
  const [socialMediaValidationError, setSocialMediaValidationError] =
    useState<null | ZodError<SocialMedia>>(null);
  const [err, setErr] = useState<null | string>(null);

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (Object.keys(updatedForm).length === 0) {
      setErr("No changes to submit");
      return;
    }

    const valid = zUpdateForm.safeParse(updatedForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    try {
      await updateUser(valid.data);
      setUpdatedForm({});
    } catch (err) {
      setErr(`${err}`);
      return;
    }
  };

  const handleConfirmSocialMedia = () => {
    const valid = zSocialMedia.safeParse(newSocialMedia);
    if (!valid.success) {
      setSocialMediaValidationError(valid.error);
      return;
    }

    updateValue("socialMedias", (prev) => [...(prev ?? user.socialMedias), valid.data]);
    resetSocialMediaModal();
  };

  const resetSocialMediaModal = () => {
    setNewSocialMedia({ username: "", link: "" });
    setSocialMediaModalVisible(false);
  };

  const updateValue = <K extends keyof UpdateForm>(
    key: K,
    value: UpdateForm[K] | ((value: UpdateForm[K]) => UpdateForm[K]),
  ) => {
    setUpdatedForm((prev) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  };

  const validationErrors = validationError && z.treeifyError(validationError);
  const socialMediaValidationErrors =
    socialMediaValidationError && z.treeifyError(socialMediaValidationError);

  return {
    display: updatedForm.display ?? user.display,
    bio: updatedForm.bio ?? user.bio,
    socialMedias: updatedForm.socialMedias ?? user.socialMedias,
    password: updatedForm.password ?? "",
    confirm: updatedForm.confirm ?? "",
    setDisplay: (display: string | undefined) => updateValue("display", display),
    setBio: (bio: string) => updateValue("bio", bio),
    setPassword: (password: string) => updateValue("password", password),
    setConfirm: (confirm: string) => updateValue("confirm", confirm),
    openSocialMediaModal: () => setSocialMediaModalVisible(true),
    socialMediaModal: {
      isVisible: socialMediaModalVisible,
      close: resetSocialMediaModal,
      confirm: handleConfirmSocialMedia,
      link: newSocialMedia.link,
      username: newSocialMedia.username,
      setLink: (link: string) => setNewSocialMedia((prev) => ({ ...prev, link })),
      setUsername: (username: string) => setNewSocialMedia((prev) => ({ ...prev, username })),
      validationErrors: socialMediaValidationErrors,
    },
    removeSocialMedia: (index: number) => {
      updateValue("socialMedias", (prev) => {
        if (!prev) return user.socialMedias.filter((_, i) => i !== index);
        return prev.filter((_, i) => i !== index);
      });
    },
    err,
    validationErrors: validationErrors,
    handleSubmit,
  };
}

import { useState, type SubmitEvent } from "react";
import useLoginContext from "../useLoginContext.ts";
import { zUserUpdateRequest, type SocialMedia } from "@gamenite/shared";
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
 *  - Form values `display`, `bio`, `socialMedias` `password`, `confirm`, `image`
 *  - Form setters `setDisplay`, `setBio`, `setPassword`, `setConfirm`, `setImage`
 *  - Form loading state `isLoading`
 *  - Social media modifiers `addSocialMedia`, `removeSocialMedia`
 *  - Possibly-null error message `err`
 *  - Possibly-null validation errors `validationErrors`
 *  - Submission handler `handleSubmit`
 */
export default function useEditProfileForm() {
  const { user, update: updateUser } = useLoginContext();
  const [updatedForm, setUpdatedForm] = useState<UpdateForm>({});
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<null | ZodError<UpdateForm>>(null);
  const [err, setErr] = useState<null | string>(null);

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    setValidationError(null);
    setErr(null);

    if (Object.keys(updatedForm).length === 0) {
      setErr("No changes to submit");
      return;
    }

    const valid = zUpdateForm.safeParse(updatedForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    setIsLoading(true);
    try {
      await updateUser(valid.data);
      setUpdatedForm({});
    } catch (err) {
      setErr(`${err}`);
      return;
    } finally {
      setIsLoading(false);
    }
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
  return {
    display: updatedForm.display ?? user.display,
    bio: updatedForm.bio ?? user.bio,
    socialMedias: updatedForm.socialMedias ?? user.socialMedias,
    password: updatedForm.password ?? "",
    confirm: updatedForm.confirm ?? "",
    image: updatedForm.image === undefined ? user.image : updatedForm.image,
    setDisplay: (display: string | undefined) => updateValue("display", display),
    setBio: (bio: string) => updateValue("bio", bio),
    setPassword: (password: string) => updateValue("password", password),
    setConfirm: (confirm: string) => updateValue("confirm", confirm),
    setImage: (image: string | null) => updateValue("image", image),
    addSocialMedia: (socialMedia: SocialMedia) => {
      updateValue("socialMedias", (prev) => [...(prev ?? user.socialMedias), socialMedia]);
    },
    removeSocialMedia: (index: number) => {
      updateValue("socialMedias", (prev) => {
        if (!prev) return user.socialMedias.filter((_, i) => i !== index);
        return prev.filter((_, i) => i !== index);
      });
    },
    isLoading,
    err,
    validationErrors: validationErrors,
    handleSubmit,
  };
}

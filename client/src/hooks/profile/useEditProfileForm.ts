import { useRef, useState, type SubmitEvent } from "react";
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
 *  - Form saved state `isSaved` (will only be true for 5 seconds after a successful save)
 *  - Social media modifiers `addSocialMedia`, `removeSocialMedia`
 *  - Possibly-null error message `err`
 *  - Possibly-null validation errors `validationErrors`
 *  - Submission handlers `handleProfileSubmit` and `handlePasswordSubmit`
 */
export default function useEditProfileForm() {
  const { user, update: updateUser } = useLoginContext();
  const [updatedForm, setUpdatedForm] = useState<UpdateForm>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTextTimeout = useRef<number | null>(null);
  const [validationError, setValidationError] = useState<null | ZodError<UpdateForm>>(null);
  const [err, setErr] = useState<null | string>(null);

  /**
   * Clears old saved messages and validation errors before submitting a form
   */
  function resetSubmissionState() {
    setValidationError(null);
    setErr(null);

    if (savedTextTimeout.current) {
      clearTimeout(savedTextTimeout.current);
      savedTextTimeout.current = null;
    }

    setIsSaved(false);
  }

  /**
   * Saves the valid user update and shows saved text temporarily
   * @param validForm the user fields that should be updated
   */
  async function submitValidForm(validForm: UpdateForm) {
    setIsLoading(true);

    try {
      await updateUser(validForm);
      setUpdatedForm({});
      setIsSaved(true);
      savedTextTimeout.current = setTimeout(() => {
        setIsSaved(false);
      }, 5000);
    } catch (err) {
      setErr(`${err}`);
      return;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handles submission of only the public profile form
   */
  const handleProfileSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetSubmissionState();

    const profileForm = {
      display: updatedForm.display,
      bio: updatedForm.bio,
      socialMedias: updatedForm.socialMedias,
      image: updatedForm.image,
    };

    const changedProfileForm = Object.fromEntries(
      Object.entries(profileForm).filter((entry) => entry[1] !== undefined),
    );

    if (Object.keys(changedProfileForm).length === 0) {
      setErr("No profile changes to submit");
      return;
    }

    const valid = zUpdateForm.safeParse(changedProfileForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    await submitValidForm(valid.data);
  };

  /**
   * Handles submission of only the password form
   */
  const handlePasswordSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetSubmissionState();

    const passwordForm = {
      password: updatedForm.password,
      confirm: updatedForm.confirm,
    };

    if (!passwordForm.password && !passwordForm.confirm) {
      setErr("No password changes to submit");
      return;
    }

    const valid = zUpdateForm.safeParse(passwordForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    await submitValidForm(valid.data);
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

  /**
   * Saves the background music setting immediately when the user picks a track
   * @param backgroundMusic the selected background music option
   */
  const handleBackgroundMusicChange = async (
    //clears old errors before saving new music setting
    backgroundMusic: NonNullable<UpdateForm["settings"]>["backgroundMusic"],
  ) => {
    resetSubmissionState();

    const settingsForm = {
      settings: {
        backgroundMusic,
      },
    };

    //checks if music is valid
    const valid = zUpdateForm.safeParse(settingsForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    //updates form so selected music changes
    updateValue("settings", {
      ...(updatedForm.settings ?? {}),
      backgroundMusic,
    });

    //saves new music setting to database
    await submitValidForm(valid.data);
  };

  /**
   * Saves the selected background music volume.
   * @param backgroundMusicVolume the selected volume to play the music
   */
  const handleBackgroundMusicVolumeChange = async (backgroundMusicVolume: number) => {
    resetSubmissionState();

    // update the music volume setting
    const settingsForm = {
      settings: {
        backgroundMusicVolume,
      },
    };

    const valid = zUpdateForm.safeParse(settingsForm);
    if (!valid.success) {
      setValidationError(valid.error);
      return;
    }

    // updates the slider
    updateValue("settings", {
      ...(updatedForm.settings ?? {}),
      backgroundMusicVolume,
    });

    await submitValidForm(valid.data);
  };

  const validationErrors = validationError && z.treeifyError(validationError);
  return {
    display: updatedForm.display ?? user.display,
    bio: updatedForm.bio ?? user.bio,
    socialMedias: updatedForm.socialMedias ?? user.socialMedias,
    password: updatedForm.password ?? "",
    confirm: updatedForm.confirm ?? "",
    image: updatedForm.image === undefined ? user.image : updatedForm.image,
    backgroundMusic: updatedForm.settings?.backgroundMusic ?? user.settings.backgroundMusic,
    setBackgroundMusic: (backgroundMusic: NonNullable<UpdateForm["settings"]>["backgroundMusic"]) =>
      updateValue("settings", {
        ...(updatedForm.settings ?? {}),
        backgroundMusic,
      }),
    backgroundMusicVolume:
      updatedForm.settings?.backgroundMusicVolume ?? user.settings.backgroundMusicVolume,
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
    isSaved,
    err,
    validationErrors: validationErrors,
    handleProfileSubmit,
    handlePasswordSubmit,
    handleBackgroundMusicChange,
    handleBackgroundMusicVolumeChange,
  };
}

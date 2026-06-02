import { useState, type SubmitEvent } from "react";
import useLoginContext from "./useLoginContext.ts";
import type { UserUpdateRequest } from "@gamenite/shared";

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
  const [display, setDisplay] = useState(user.display);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<null | string>(null);

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (user.display === display && password === confirm && password === "") {
      setErr("No changes to submit");
      return;
    }

    if (display.trim() !== display) {
      setErr("Display names can't begin or end with whitespace");
      return;
    }

    if (display.trim() === "") {
      setErr("Please enter a display name");
      return;
    }

    if (password.trim() !== password) {
      setErr("Passwords can't begin or end with whitespace");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }

    const updates: UserUpdateRequest = {};
    if (display !== user.display) updates.display = display;
    if (password !== "") updates.password = password;
    try {
      await updateUser(updates);
    } catch (err) {
      setErr(`${err}`);
      return;
    }
  };

  return {
    display,
    setDisplay,
    password,
    setPassword,
    confirm,
    setConfirm,
    err,
    handleSubmit,
  };
}

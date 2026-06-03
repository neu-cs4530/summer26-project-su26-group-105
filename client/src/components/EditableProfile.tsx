import { useId, useState } from "react";
import useLoginContext from "../hooks/useLoginContext";
import useTimeSince from "../hooks/useTimeSince";
import useEditProfileForm from "../hooks/useEditProfileForm";
import ProfileImage from "./ProfileImage";
import SocialMedia from "./SocialMedia";
import "./Profile.css";
import "./EditableProfile.css";
import TextInput from "./TextInput";
import { createPortal } from "react-dom";
import Modal from "./Modal";

export default function EditableProfile() {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  const [showPass, setShowPass] = useState(false);
  const {
    display,
    setDisplay,
    bio,
    setBio,
    socialMedias,
    isSocialMediaModalVisible,
    openSocialMediaModal,
    confirmSocialMedia,
    closeSocialMediaModal,
    newSocialMediaUsername,
    setNewSocialMediaUsername,
    newSocialMediaLink,
    setNewSocialMediaLink,
    removeSocialMedia,
    password,
    setPassword,
    confirm,
    setConfirm,
    err,
    handleSubmit,
  } = useEditProfileForm();

  const displayId = useId();
  const bioId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2 style={{ textAlign: "center" }}>Public Profile</h2>
      <div className="profile-container">
        <div className="pfp">
          {/*<button>Edit</button>*/}
          <ProfileImage src={user.image} size="large" />
        </div>
        <div className="name">
          <label htmlFor={displayId}>Display Name</label>
          <TextInput
            className="widefill"
            id={displayId}
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            buttons={
              <button
                className="secondary small"
                type="button"
                onClick={(e) => {
                  setDisplay(user.display);
                }}
              >
                Reset
              </button>
            }
          />
          <span className="join-date">Joined {timeSince(user.createdAt)}</span>
        </div>
        <div className="socials">
          {socialMedias.map((s, i) => (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <SocialMedia socialMedia={s} />
              <button className="cancel small" type="button" onClick={() => removeSocialMedia(i)}>
                Remove
              </button>
            </div>
          ))}
          {socialMedias.length < 12 && (
            <button type="button" className="secondary narrow" onClick={openSocialMediaModal}>
              Add New Social Media
            </button>
          )}
        </div>
        <div className="bio">
          <label htmlFor={bioId}>Bio</label>
          <textarea
            id={bioId}
            className="widefill"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </div>
      <hr />
      <h2 style={{ textAlign: "center" }}>Account Settings</h2>
      <div className="account-settings">
        <label htmlFor={passwordId}>New Password</label>
        <TextInput
          id={passwordId}
          type={showPass ? "input" : "password"}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="setting widefill notTooWide"
          buttons={
            <>
              <button
                className="secondary small"
                type="button"
                onClick={() => {
                  setPassword("");
                  setConfirm("");
                }}
              >
                Reset
              </button>
              <button
                className="secondary small"
                aria-label="Toggle show password"
                type="button"
                onClick={() => {
                  setShowPass((v) => !v);
                }}
              >
                {showPass ? "Hide" : "Reveal"}
              </button>
            </>
          }
        />
        <label htmlFor={confirmPasswordId}>Confirm New Password</label>
        <TextInput
          id={confirmPasswordId}
          type={showPass ? "input" : "password"}
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="setting widefill notTooWide"
        />
      </div>
      {err && <p className="error-message">{err}</p>}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button className="primary narrow">Submit</button>
      </div>
      {isSocialMediaModalVisible &&
        createPortal(
          <Modal close={closeSocialMediaModal}>
            <h3>Add New Social Media</h3>
            <input
              type="text"
              placeholder="Link to social media profile"
              className="widefill notTooWide"
              value={newSocialMediaLink}
              onChange={(e) => setNewSocialMediaLink(e.target.value)}
            />
            <input
              type="text"
              placeholder="Username on that platform"
              className="widefill notTooWide"
              value={newSocialMediaUsername}
              onChange={(e) => setNewSocialMediaUsername(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
              <button className="cancel narrow" type="button" onClick={closeSocialMediaModal}>
                Cancel
              </button>
              <button className="primary narrow" type="button" onClick={confirmSocialMedia}>
                Add
              </button>
            </div>
          </Modal>,
          document.body,
        )}
    </form>
  );
}

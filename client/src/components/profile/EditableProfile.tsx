import { useState } from "react";
import useLoginContext from "../../hooks/useLoginContext";
import useTimeSince from "../../hooks/useTimeSince";
import useEditProfileForm from "../../hooks/profile/useEditProfileForm";
import ProfileImage from "../ProfileImage";
import SocialMedia from "../SocialMedia";
import "./Profile.css";
import "./EditableProfile.css";
import TextInput from "../TextInput";
import SocialMediaModal from "./SocialMediaModal";
import ImageModal from "./ImageModal";

export default function EditableProfile() {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  const [showPass, setShowPass] = useState(false);
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const {
    display,
    setDisplay,
    bio,
    setBio,
    socialMedias,
    addSocialMedia,
    removeSocialMedia,
    password,
    setPassword,
    confirm,
    setConfirm,
    image,
    setImage,
    err,
    validationErrors,
    handleSubmit,
  } = useEditProfileForm();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2 style={{ textAlign: "center" }}>Public Profile</h2>
      <div className="profile-container">
        <div className="pfp">
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            aria-label="Edit Profile Image"
          >
            <ProfileImage src={image} size="large" />
          </button>
        </div>
        <div className="name">
          <TextInput
            label="Display Name"
            className="widefill"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            error={validationErrors?.properties?.display?.errors?.[0]}
            buttons={
              <button
                className="secondary small"
                type="button"
                onClick={(e) => {
                  setDisplay(undefined);
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
            <div style={{ display: "flex", gap: "0.5rem" }} key={i + s.link + s.username}>
              <SocialMedia socialMedia={s} />
              <button className="cancel small" type="button" onClick={() => removeSocialMedia(i)}>
                Remove
              </button>
            </div>
          ))}
          {socialMedias.length < 12 && (
            <button
              type="button"
              className="secondary narrow"
              onClick={() => setShowSocialMediaModal(true)}
            >
              Add New Social Media
            </button>
          )}
        </div>
        <div className="bio">
          <TextInput
            label="Bio"
            isTextArea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="widefill"
            error={validationErrors?.properties?.bio?.errors?.[0]}
          />
        </div>
      </div>
      <hr />
      <h2 style={{ textAlign: "center" }}>Account Settings</h2>
      <div className="account-settings">
        <TextInput
          label="New Password"
          type={showPass ? "input" : "password"}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="widefill notTooWide"
          containerClassName="setting"
          error={validationErrors?.properties?.password?.errors?.[0]}
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
        <TextInput
          label="Confirm New Password"
          type={showPass ? "input" : "password"}
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="widefill notTooWide"
          containerClassName="setting"
          error={validationErrors?.properties?.confirm?.errors?.[0]}
        />
      </div>
      {err && <p className="error-message">{err}</p>}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button className="primary narrow">Submit</button>
      </div>
      {showSocialMediaModal && (
        <SocialMediaModal save={addSocialMedia} close={() => setShowSocialMediaModal(false)} />
      )}
      {showImageModal && (
        <ImageModal save={setImage} close={() => setShowImageModal(false)} currentImage={image} />
      )}
    </form>
  );
}

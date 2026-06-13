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
import Loading from "../Loading";
import ProfileStats from "./ProfileStats";
import RecentlyPlayedGames from "./RecentlyPlayedGames";

/**
 * Component for editing the user's profile whos signed in
 * @returns the editable profile form ui
 */
export default function EditableProfile() {
  //gets the signed in user
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  //tracks whether social media os open
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);
  //tracks edit profile image is open
  const [showImageModal, setShowImageModal] = useState(false);

  //gets profile state and validation logic
  const {
    display,
    setDisplay,
    bio,
    setBio,
    socialMedias,
    addSocialMedia,
    removeSocialMedia,
    image,
    setImage,
    isLoading,
    isSaved,
    err,
    validationErrors,
    handleProfileSubmit,
  } = useEditProfileForm();

  return (
    <form className="content spacedSection" onSubmit={handleProfileSubmit}>
      <h2 style={{ textAlign: "left" }}>Public Profile</h2>

      <div className="profile-layout">
        {/* left side contains the editable profile form fields */}
        <section className="profile-left-panel">
          {/* clicking pfp opens the image editing modal */}
          <div className="pfp">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              aria-label="Edit Profile Image"
            >
              <ProfileImage src={image} size="large" />
            </button>
          </div>

          {/* Display name input and join date */}
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
                  onClick={() => {
                    setDisplay(undefined);
                  }}
                >
                  Reset
                </button>
              }
            />

            <span className="join-date">Joined {timeSince(user.createdAt)}</span>
          </div>

          {/* Bio text input field */}
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
          {/* Editable social media list */}
          <div className="socials">
            {socialMedias.map((s, i) => (
              <div className="editable-social-row" key={i + s.link + s.username}>
                <SocialMedia socialMedia={s} />

                <button className="cancel small" type="button" onClick={() => removeSocialMedia(i)}>
                  Remove
                </button>
              </div>
            ))}

            {/* only lets you add 3 social media links */}
            {socialMedias.length < 3 && (
              <button
                type="button"
                className="secondary narrow"
                onClick={() => setShowSocialMediaModal(true)}
              >
                Add New Social Media
              </button>
            )}
          </div>
        </section>

        {/* right side shows the game stats and recently played games */}
        <section className="profile-right-panel">
          <ProfileStats username={user.username} />
          <RecentlyPlayedGames username={user.username} />
        </section>
      </div>

      {/* either lets you save profile or error from validation */}
      {err && <p className="error-message">{err}</p>}
      {/* button for submitting profile changes */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
        <button
          className="primary narrow"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          disabled={isLoading}
        >
          {isLoading && <Loading />}
          {isSaved ? "Profile Saved Successfully" : "Save Profile Changes"}
        </button>
      </div>

      {/* social media modal for adding new social media links */}
      {showSocialMediaModal && (
        <SocialMediaModal save={addSocialMedia} close={() => setShowSocialMediaModal(false)} />
      )}

      {showImageModal && (
        <ImageModal save={setImage} close={() => setShowImageModal(false)} currentImage={image} />
      )}
    </form>
  );
}

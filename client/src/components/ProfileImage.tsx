import "./ProfileImage.css";
import Avatar from "../assets/avatar.png";
import FallbackImage from "./FallbackImage";
import type { ActivityStatus } from "@gamenite/shared/src/friend.types";

type ProfileImageProps = {
  src: string | null;
  size: "small" | "medium" | "large";
  activityStatus?: ActivityStatus;
};

/**
 * A user's profile image, with an optional activity status indicator dot.
 * @param src The source URL of the image
 * @param size The size to display the image
 * @param activityStatus If provided, renders a status dot in the bottom-right corner
 */
export default function ProfileImage({ src, size, activityStatus }: ProfileImageProps) {
  return (
    <span className={`profile-image-wrapper ${size}`}>
      <FallbackImage src={src} fallback={Avatar} className={`profile-image ${size}`} />
      {activityStatus && (
        <span
          className={`status-dot status-dot--${size} status-dot--${activityStatus}`}
          aria-label={activityStatus}
        />
      )}
    </span>
  );
}

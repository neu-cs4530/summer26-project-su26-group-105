import "./ProfileImage.css";
import Avatar from "../assets/avatar.png";
import FallbackImage from "./FallbackImage";
import type { ActivityStatus } from "@gamenite/shared/src/friend.types";
import type { AvatarDecoration as AvatarDecorationType } from "@gamenite/shared";
import AvatarDecoration from "./AvatarDecoration";

type ProfileImageProps = {
  src: string | null;
  size: "small" | "medium" | "large";
  activityStatus?: ActivityStatus;
  blocked?: boolean;
  decorations: AvatarDecorationType[];
};

/**
 * A user's profile image, with an optional activity status indicator dot.
 * @param src The source URL of the image
 * @param size The size to display the image
 * @param activityStatus If provided, renders a status dot in the bottom-right corner
 * @param blocked If user is blocked, profile image is not available
 */
export default function ProfileImage({ decorations, ...props }: ProfileImageProps) {
  return (
    <RawProfileImage {...props}>
      {decorations.map((decoration) => (
        <AvatarDecoration key={decoration.id} decoration={decoration} />
      ))}
    </RawProfileImage>
  );
}

/**
 * A user's profile image, with an optional activity status indicator dot.
 * @param src The source URL of the image
 * @param size The size to display the image
 * @param activityStatus If provided, renders a status dot in the bottom-right corner
 * @param blocked If user is blocked, profile image is not available
 */
export function RawProfileImage({
  src,
  size,
  activityStatus,
  blocked,
  children,
}: Omit<ProfileImageProps, "decorations"> & { children?: React.ReactNode }) {
  return (
    <span className={`profile-image-wrapper ${size}`}>
      {blocked ? (
        <span className={`profile-image ${size} profile-image--blocked`} />
      ) : (
        <FallbackImage
          src={src}
          fallback={Avatar}
          className={`profile-image ${size}`}
          draggable={false}
        />
      )}
      {children}
      {activityStatus && (
        <span
          className={`status-dot status-dot--${size} status-dot--${activityStatus}`}
          aria-label={activityStatus}
        />
      )}
    </span>
  );
}

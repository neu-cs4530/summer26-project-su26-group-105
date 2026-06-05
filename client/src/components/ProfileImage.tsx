import "./ProfileImage.css";
import Avatar from "../assets/avatar.png";
import FallbackImage from "./FallbackImage";

type ProfileImageProps = {
  src: string | null;
  size: "small" | "medium" | "large";
};

/**
 * A users profile image
 * @param src The source URL of the image
 * @param size The size to display the image
 */
export default function ProfileImage({ src, size }: ProfileImageProps) {
  return <FallbackImage src={src} fallback={Avatar} className={`profile-image ${size}`} />;
}

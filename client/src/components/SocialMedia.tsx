import type { SocialMedia } from "@gamenite/shared";
import "./SocialMedia.css";
import FallbackImage from "./FallbackImage";
import Link from "../assets/link-icon.svg";

type SocialMediaProps = {
  socialMedia: SocialMedia;
};

export default function SocialMedia({ socialMedia }: SocialMediaProps) {
  const favicon = new URL(socialMedia.link).origin + "/favicon.ico";

  return (
    <a href={socialMedia.link} target="_blank" rel="noopener noreferrer" className="social">
      <FallbackImage src={favicon} fallback={Link} />
      <span>@{socialMedia.username}</span>
    </a>
  );
}

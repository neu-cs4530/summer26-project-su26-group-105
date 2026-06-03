import type { SocialMedia } from "@gamenite/shared";
import "./SocialMedia.css";
import FallbackImage from "./FallbackImage";
import Link from "../assets/link-icon.svg";

type SocialMediaProps = {
  socialMedia: SocialMedia;
};

export default function SocialMedia({ socialMedia }: SocialMediaProps) {
  let favicon = Link;

  try {
    favicon = new URL(socialMedia.link).origin + "/favicon.ico";
  } catch (_) {
    // If the URL is invalid, we just use the default link icon.
  }

  return (
    <a href={socialMedia.link} target="_blank" rel="noopener noreferrer" className="social">
      <FallbackImage src={favicon} fallback={Link} />
      <span>@{socialMedia.username}</span>
    </a>
  );
}

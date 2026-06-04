import { useState } from "react";
import { UserCardContext } from "../contexts/UserCardContext";
import type { SafeUserInfo } from "@gamenite/shared";
import "./UserCardProvider.css";
import ProfileImage from "./ProfileImage";
import SocialMedia from "./SocialMedia";

export default function UserCardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    isHovered: boolean;
    active: null | { user: SafeUserInfo; anchor: string };
  }>({ isHovered: false, active: null });

  const setDisplayedUser = (user: SafeUserInfo, anchor: string) => {
    setState((s) => ({ isHovered: s.isHovered, active: { user, anchor } }));
  };

  const stopDisplaying = (stopAnchor: string) => {
    setTimeout(() => {
      setState((s) => {
        if (s.isHovered) return s;
        if (s.active?.anchor === stopAnchor) {
          return { isHovered: false, active: null };
        }
        return s;
      });
    }, 250);
  };

  const handleMouseEnter = () => {
    setState((s) => ({ isHovered: true, active: s.active }));
  };

  const handleMouseLeave = () => {
    setState((s) => ({ isHovered: false, active: s.active }));
    if (state.active?.anchor) stopDisplaying(state.active.anchor);
  };

  return (
    <UserCardContext.Provider value={{ setDisplayedUser, stopDisplaying }}>
      {children}
      {state.active && (
        <div
          className="card"
          style={{ positionAnchor: state.active.anchor }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="user-info">
            <div className="pfp">
              <ProfileImage src={state.active.user.image} size="medium" />
            </div>
            <div className="user">
              <div className="display">{state.active.user.display}</div>
              <div className="username">@{state.active.user.username}</div>
            </div>
          </div>
          <div className="socials">
            {state.active.user.socialMedias.slice(0, 3).map((social, i) => (
              <SocialMedia socialMedia={social} key={i} iconOnly />
            ))}
          </div>
          <p className="bio">{state.active.user.bio}</p>
        </div>
      )}
    </UserCardContext.Provider>
  );
}

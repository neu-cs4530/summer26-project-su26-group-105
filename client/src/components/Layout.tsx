import "./Layout.css";
import { Outlet } from "react-router-dom";
import Header from "./Header.tsx";
import SideBarNav from "./SideBarNav.tsx";
import { FriendStatusContext } from "../contexts/FriendStatusContext.ts";
import useFriendStatusMap from "../hooks/useFriendStatusMap.ts";
import UserCardProvider from "./UserCardProvider.tsx";

/**
 * Main component represents the layout of the main page, including a sidebar
 * and the main content area. Also provides the global FriendStatusContext so
 * any component on any page can look up a friend's activity status.
 */
export default function Layout() {
  const statusMap = useFriendStatusMap();
  return (
    <FriendStatusContext.Provider value={statusMap}>
      <UserCardProvider>
        <div id="main" className="main">
          <Header />
          <SideBarNav />
          <div id="right_main" className="right_main">
            <Outlet />
          </div>
        </div>
      </UserCardProvider>
    </FriendStatusContext.Provider>
  );
}

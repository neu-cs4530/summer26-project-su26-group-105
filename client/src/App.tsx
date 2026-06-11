/* eslint no-console: "off" */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login.tsx";
import type { AuthContext } from "./contexts/LoginContext.ts";
import Layout from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import ThreadList from "./pages/ThreadList.tsx";
import Profile from "./pages/Profile.tsx";
import { io } from "socket.io-client";
import type { GameSocket } from "./util/types.ts";
import LoggedInRoute from "./components/LoggedInRoute.tsx";
import NewGame from "./pages/NewGame.tsx";
import Game from "./pages/Game.tsx";
import GameList from "./pages/GameList.tsx";
import ThreadPage from "./pages/ThreadPage.tsx";
import { ErrorBoundary } from "react-error-boundary";
import fallback from "./fallback.tsx";
import NewThread from "./pages/NewThread.tsx";
import TimeContextKeeper from "./components/UpdatingTimeContext.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Friends from "./pages/Friends.tsx";
import type { ThemeMode } from "./components/Settings.tsx";

/** If `true`, all incoming socket messages will be logged */
const DEBUG_SOCKETS = false;

/**
 * Websocket connection for the app. It would be natural to define this in a
 * useEffect hook, but the React docts advise against this.
 * https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
 * */
let socket: GameSocket | null = null;
if (typeof window !== "undefined") {
  socket = io();
  if (DEBUG_SOCKETS) {
    socket.onAny((tag, payload) => {
      console.log(`from socket got ${tag}(${JSON.stringify(payload)})`);
    });
  }
}

function NoSuchRoute() {
  const { pathname } = useLocation();
  return `No page found for route '${pathname}'`;
}

export default function App() {
  const [auth, setAuth] = useState<AuthContext | null>(null);
  useEffect(() => {
    // local storage saves the theme even if the page is refreshed
    //avoided adding this as a useState for this reason
    const savedTheme = localStorage.getItem("theme");
    //checks if its a valid theme
    const isThemeMode = (theme: string | null): theme is ThemeMode => {
      return theme === "light" || theme === "dark";
    };

    //if the saved theme is valid, then apply it to HTML
    if (isThemeMode(savedTheme)) {
      document.documentElement.dataset.theme = savedTheme;
    } else {
      //if not valid, default to light
      document.documentElement.dataset.theme = "light";
      localStorage.setItem("theme", "light");
    }
  }, []);
  return (
    socket && (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setAuth={setAuth} />} />
          <Route
            element={
              <LoggedInRoute auth={auth} socket={socket}>
                <TimeContextKeeper updateFrequency={20 * 1000}>
                  <ErrorBoundary fallbackRender={fallback}>
                    <Layout />
                  </ErrorBoundary>
                </TimeContextKeeper>
              </LoggedInRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<ThreadList />} />
            <Route path="/forum/post/new" element={<NewThread />} />
            <Route path="/forum/post/:threadId" element={<ThreadPage />} />
            <Route path="/games" element={<GameList />} />
            <Route path="/game/new" element={<NewGame />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/*" element={<NoSuchRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import useThreadList from "../hooks/useThreadList.ts";
import DMControlPanel from "../components/DmControl.tsx";
import "./ThreadList.css";

export default function ThreadList() {
  const threadList = useThreadList();
  const navigate = useNavigate();

  // Tracks which viewport tab the user has open currently
  const [activeTab, setActiveTab] = useState<"forum" | "messages">("forum");

  return (
    <div className="content">
      {/* Tab buttons for forum vs dms */}
      <div className="profile-tabs" style={{ marginBottom: "24px" }}>
        <button
          className={activeTab === "forum" ? "active-tab" : ""}
          onClick={() => setActiveTab("forum")}
        >
          Community Forums
        </button>

        <button
          className={activeTab === "messages" ? "active-tab" : ""}
          onClick={() => setActiveTab("messages")}
        >
          Direct Messages
        </button>
      </div>

      {/* Forums*/}
      {activeTab === "forum" && (
        <div className="spacedSection">
          <h2>All forum posts</h2>
          <div>
            <button className="primary narrow" onClick={() => navigate("/forum/post/new")}>
              Create New Post
            </button>
          </div>
          <>
            {"message" in threadList ? (
              threadList.message
            ) : (
              <div className="dottedList">
                {threadList.map((thread) => (
                  <ThreadSummaryView {...thread} key={thread.threadId.toString()} />
                ))}
              </div>
            )}
          </>
        </div>
      )}

      {/* DMS */}
      {activeTab === "messages" && <DMControlPanel />}
    </div>
  );
}

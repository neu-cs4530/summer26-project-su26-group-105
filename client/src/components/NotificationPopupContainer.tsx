import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./NotificationPopupContainer.css";

/**
 * Represents a popup notification that can be shown on the screen
 */
interface PopupNotification {
  //id so that it can be rendered and removed
  id: number;
  type: "friendRequestReceived" | "friendRequestAccepted" | "gameInvite" | "friendGameActivity";
  message: string;
}

/**
 * Displays a temporary notification popup when a notification event is received
 * @returns the popup notification
 */
export default function NotificationPopupContainer() {
  const { socket, user } = useLoginContext();
  const auth = useAuth();
  //stores the list of popup notifications currently visible on the screen
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);

  useEffect(() => {
    //gets the user's friend list
    socket.emit("friendList", { auth, payload: {} });

    //handles when a popup notification is received from the server
    const handleNotificationPopup = (payload: {
      type: "friendRequestReceived" | "friendRequestAccepted" | "gameInvite" | "friendGameActivity";
      message: string;
    }) => {
      //if the user turned notification off, return
      if (
        payload.type === "friendRequestReceived" &&
        !user.settings.receivesFriendRequestNotifications
      ) {
        return;
      }
      //if the user turned notification off, return
      if (
        payload.type === "friendRequestAccepted" &&
        !user.settings.receivesFriendAcceptedNotifications
      ) {
        return;
      }
      //if the user turned notification off, return
      if (
        payload.type === "friendGameActivity" &&
        !user.settings.receivesFriendGameActivityNotifications
      ) {
        return;
      }

      //gets a new id so that it can be removed later
      const id = Date.now();

      //add that popup to the list of visible notifications
      setNotifications((currentNotifications) => [
        {
          id,
          type: payload.type,
          message: payload.message,
        },
        ...currentNotifications,
      ]);

      //removes the popup after 5 seconds
      setTimeout(() => {
        setNotifications((currentNotifications) =>
          currentNotifications.filter((notification) => notification.id !== id),
        );
      }, 5000);
    };

    socket.on("notificationPopup", handleNotificationPopup);

    return () => {
      socket.off("notificationPopup", handleNotificationPopup);
    };
  }, [socket, auth, user.settings]);

  return (
    <div className="notification-popup-container">
      {/* Creates a popup for each notification stored in the state */}
      {notifications.map((notification) => (
        <div key={notification.id} className="notification-popup">
          {/* Close it manually if wanted */}
          <button
            className="notification-close-button"
            onClick={() =>
              setNotifications((currentNotifications) =>
                currentNotifications.filter(
                  (currentNotification) => currentNotification.id !== notification.id,
                ),
              )
            }
          >
            ×
          </button>

          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}

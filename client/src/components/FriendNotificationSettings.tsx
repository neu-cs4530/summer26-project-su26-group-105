import "./FriendNotificationSettings.css";
import useLoginContext from "../hooks/useLoginContext";

/**
 * The notification settings that will be in the settings page.
 * @returns the UI and log for the notification settings
 */
export default function FriendNotificationSettings() {
  const { user, update } = useLoginContext();

  // stores if the user wants to get friend requests notification popups
  const friendRequests: boolean = user.settings.receivesFriendRequestNotifications;
  // stores if the user wants to see if their friend request was accepted
  const acceptedFriendRequests: boolean = user.settings.receivesFriendAcceptedNotifications;
  // stores if the user wants to see if their friend invited them
  const gameInvites: boolean = user.settings.receivesGameInviteNotifications;
  // stores if the user wants to see if their friend created/joined a game
  const friendGameActivity: boolean = user.settings.receivesFriendGameActivityNotifications;

  //sets up each notification on the settings page
  const notificationSettings = [
    {
      setting: "receivesFriendRequestNotifications",
      title: "Receive Friend Requests",
      description: "Get notified when someone sends you a friend request.",
      checked: friendRequests,
    },
    {
      setting: "receivesFriendAcceptedNotifications",
      title: "Accepted Friend Requests",
      description: "Get notified when someone accepts your friend request.",
      checked: acceptedFriendRequests,
    },
    {
      setting: "receivesGameInviteNotifications",
      title: "Game Invites",
      description: "Get notified when someone invites you to a game.",
      checked: gameInvites,
    },
    {
      setting: "receivesFriendGameActivityNotifications",
      title: "Friend Game Activity",
      description: "Get notified when a friend starts or joins a game.",
      checked: friendGameActivity,
    },
  ] as const;

  /**
   * Updates one notification setting for the current user
   * @param setting the notification field that should be changed
   * @param value whether that notification should be enabled or not
   */
  async function updateNotificationSetting(
    setting:
      | "receivesFriendRequestNotifications"
      | "receivesFriendAcceptedNotifications"
      | "receivesGameInviteNotifications"
      | "receivesFriendGameActivityNotifications",
    value: boolean,
  ) {
    await update({
      settings: {
        [setting]: value,
      },
    });
  }

  return (
    // goes through each notification in notificationSettings and creates it
    <div className="notification-settings">
      {notificationSettings.map((notification) => (
        <div className="notification-row" key={notification.setting}>
          <div>
            <h3>{notification.title}</h3>
            <p>{notification.description}</p>
          </div>

          <input
            type="checkbox"
            checked={notification.checked}
            onChange={(event) =>
              updateNotificationSetting(notification.setting, event.target.checked)
            }
          />
        </div>
      ))}
    </div>
  );
}

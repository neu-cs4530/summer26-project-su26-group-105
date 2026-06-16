import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createUser } from "./testUtils.ts";

let userContext1: BrowserContext;
let userContext2: BrowserContext;
let page1: Page;
let page2: Page;

test.beforeEach(async ({ browser }) => {
  userContext1 = await browser.newContext();
  userContext2 = await browser.newContext();
  page1 = await userContext1.newPage();
  page2 = await userContext2.newPage();
});

test.afterEach(async () => {
  await userContext1.close();
  await userContext2.close();
});

// creates a friend only game
async function createFriendOnlyGame(page: Page) {
  await page.getByRole("link", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Create New Game" }).click();
  await page.waitForURL("/game/new");
  await page.getByRole("switch", { name: "Friends only" }).click();
  await expect(page.getByText("Only your friends can join")).toBeVisible();
  await page.locator(".newGameEntry").filter({ hasText: "Nim" }).click();
  await page.waitForURL(/\/game\/.+/);
}

// makes two users friends
async function makeFriends(
  senderPage: Page,
  senderUsername: string,
  receiverPage: Page,
  receiverUsername: string,
) {
  // Sender searches for and requests receiver
  await senderPage.getByRole("link", { name: "Friends" }).click();
  await senderPage.getByRole("button", { name: "Search Users" }).click();
  await senderPage.getByPlaceholder("Search by username or display name...").fill(receiverUsername);
  await expect(senderPage.getByText(`@${receiverUsername}`)).toBeVisible();
  await senderPage
    .getByRole("row")
    .filter({ hasText: `@${receiverUsername}` })
    .getByRole("button", { name: "Add Friend" })
    .click();

  // receiver accepts
  await receiverPage.getByRole("link", { name: "Friends" }).click();
  await receiverPage.getByRole("button", { name: "Pending" }).click();
  await receiverPage.getByRole("button", { name: "Accept" }).click();
  await receiverPage.getByRole("button", { name: "Friends" }).click();
  await expect(
    receiverPage.getByRole("row").filter({ hasText: new RegExp(senderUsername) }),
  ).toBeVisible({ timeout: 5000 });
}

// friend only game tests
test.describe("Friend-only games", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
  });

  test("friend-only game shows 🔒 Friends Only badge in game list", async () => {
    await createFriendOnlyGame(page1);

    await page1.getByRole("link", { name: "Games", exact: true }).click();
    await expect(page1.getByText("Friends Only")).toBeVisible();
  });

  test("creator can always see their own friend-only game", async () => {
    await createFriendOnlyGame(page1);
    await page1.getByRole("link", { name: "Games", exact: true }).click();
    await expect(page1.getByText("Friends Only")).toBeVisible(); // badge is always visible to creator
  });

  test("non-friend cannot see friend-only game in list", async () => {
    await createFriendOnlyGame(page1);

    await page2.getByRole("link", { name: "Games", exact: true }).click();
    await expect(page2.getByRole("listitem").filter({ hasText: username1 })).toHaveCount(0);
  });

  test("non-friend gets error when trying to watch friend-only game directly", async () => {
    await createFriendOnlyGame(page1);
    const gameUrl = page1.url();

    await page2.goto(gameUrl);
    await page2.waitForURL(/\/game\/.+/);
    // Either an error message shows, or the game content never loads
    await expect(page2.getByText("waiting for game to begin")).not.toBeVisible({ timeout: 5000 });
    await expect(page2.getByText("Join Game")).not.toBeVisible();
  });

  test("friend can see friend-only game in list", async () => {
    await makeFriends(page1, username1, page2, username2);

    await createFriendOnlyGame(page1);

    await page2.getByRole("link", { name: "Games", exact: true }).click();
    await expect(page2.getByRole("listitem").filter({ hasText: username1 })).toHaveCount(1);
  });
});

// activity status tests
test.describe("Activity status", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;

    await makeFriends(page1, username1, page2, username2);
    await page1.waitForTimeout(1000); // ensure user1's online status is propagated
    await page2.waitForTimeout(1000); // ensure page2 has received updated friend list
  });

  test("status picker appears when clicking avatar in header", async () => {
    await page1.getByLabel("Set activity status").click();
    await expect(page1.getByText("Set Status")).toBeVisible();
    await expect(page1.getByText("🟢 Online")).toBeVisible();
    await expect(page1.getByText("🌙 Idle")).toBeVisible();
    await expect(page1.getByText("⛔ Do Not Disturb")).toBeVisible();
    await expect(page1.getByText("⚫ Appear Offline")).toBeVisible();
  });

  test("user can change their own status", async () => {
    await page1.getByLabel("Set activity status").click();
    await page1.getByText("🌙 Idle").click();

    await expect(page1.getByText("Set Status")).not.toBeVisible();
  });

  test("online status dot is visible on friends page for online friend", async () => {
    await page2.getByRole("link", { name: "Friends" }).click();
    // First verify the friend entry exists at all
    await expect(page2.getByRole("row").filter({ hasText: new RegExp(username1) })).toHaveCount(1, {
      timeout: 10000,
    });
    // Then check for the dot
    const friendEntry = page2.getByRole("row").filter({ hasText: new RegExp(username1) });
    await expect(friendEntry.locator(".status-dot--online")).toBeVisible({ timeout: 10000 });
  });

  test("status updates propagate to friends in real time", async () => {
    // user1 sets status to DND
    await page1.getByLabel("Set activity status").click();
    await page1.getByText("⛔ Do Not Disturb").click();

    // user2 should see DND dot on friends page
    await page2.getByRole("link", { name: "Friends" }).click();
    const friendEntry = page2.getByRole("row").filter({ hasText: new RegExp(username1) });
    await expect(friendEntry.locator(".status-dot--dnd")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Friends page UI", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
  });

  test("search tab finds users by username", async () => {
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
  });

  test("add friend button appears for non-friends in search", async () => {
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(
      page1
        .getByRole("row")
        .filter({ hasText: `@${username2}` })
        .getByRole("button", { name: "Add Friend" }),
    ).toBeVisible();
  });

  test("pending tab shows incoming request after friend request sent", async () => {
    // user1 sends request to user2
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await page1
      .getByRole("row")
      .filter({ hasText: `@${username2}` })
      .getByRole("button", { name: "Add Friend" })
      .click();

    // user2 sees incoming request
    await page2.getByRole("link", { name: "Friends" }).click();
    await page2.getByRole("button", { name: "Pending" }).click();
    await expect(page2.getByText("Incoming Requests")).toBeVisible();
    await expect(page2.getByRole("row").filter({ hasText: username1 })).toBeVisible();
  });

  test("decline friend request removes it from pending", async () => {
    // user1 sends request
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await page1
      .getByRole("row")
      .filter({ hasText: `@${username2}` })
      .getByRole("button", { name: "Add Friend" })
      .click();

    // user2 declines
    await page2.getByRole("link", { name: "Friends" }).click();
    await page2.getByRole("button", { name: "Pending" }).click();
    await page2.getByRole("button", { name: "Decline" }).click();
    await expect(page2.getByText("No pending requests.")).toBeVisible();
  });

  test("accepted friend appears in friends list", async () => {
    await makeFriends(page1, username1, page2, username2);
    await expect(page1.getByRole("row").filter({ hasText: new RegExp(username2) })).toBeVisible();
  });

  test("blocking a user from search moves them to blocked tab", async () => {
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();

    // open three dot menu and block
    await page1
      .getByRole("row")
      .filter({ hasText: `@${username2}` })
      .getByRole("button", { name: "More options" })
      .click();
    await page1.getByRole("button", { name: /Block User/i }).click();
    await page1.getByRole("button", { name: "OK" }).click();

    // check blocked tab
    await page1.getByRole("button", { name: /Blocked/i }).click();
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
  });

  test("unblocking a user removes them from blocked tab", async () => {
    // block first
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1.getByRole("button", { name: "Search Users" }).click();
    await page1.getByPlaceholder("Search by username or display name...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await page1
      .getByRole("row")
      .filter({ hasText: `@${username2}` })
      .getByRole("button", { name: "More options" })
      .click();
    await page1.getByRole("button", { name: /Block User/i }).click();
    await page1.getByRole("button", { name: "OK" }).click();

    // then unblock
    await page1.getByRole("button", { name: /Blocked/i }).click();
    await page1.getByRole("button", { name: "Unblock" }).click();
    await page1.getByRole("button", { name: "OK" }).click();
    await expect(page1.getByText("You haven't blocked anyone.")).toBeVisible();
  });
});

test.describe("Shared stats", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
  });

  test("shared stats section does not appear on non-friend profile", async () => {
    await page1.goto(`/profile/${username2}`);
    await expect(page1.getByText("Your Shared Stats")).not.toBeVisible();
  });

  test("shared stats section appears on friend's profile", async () => {
    await makeFriends(page1, username1, page2, username2);
    // Navigate via UI instead of goto
    await page1.getByRole("link", { name: "Friends" }).click();
    await expect(page1.getByRole("row").filter({ hasText: new RegExp(username2) })).toBeVisible();
    await page1
      .getByRole("row")
      .filter({ hasText: new RegExp(username2) })
      .getByRole("link")
      .first()
      .click();
    await expect(page1.getByText("Your Shared Stats")).toBeVisible({ timeout: 8000 });
  });

  test("shared stats shows empty state when no games played together", async () => {
    await makeFriends(page1, username1, page2, username2);
    await page1.getByRole("link", { name: "Friends" }).click();
    await expect(page1.getByRole("row").filter({ hasText: new RegExp(username2) })).toBeVisible();
    await page1
      .getByRole("row")
      .filter({ hasText: new RegExp(username2) })
      .getByRole("link")
      .first()
      .click();
    await expect(page1.getByText("You haven't finished any games together yet")).toBeVisible({
      timeout: 8000,
    });
  });
});

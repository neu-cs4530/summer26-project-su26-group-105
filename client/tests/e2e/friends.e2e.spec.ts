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
  await page.getByLabel("Game selection").selectOption("nim");
  await page.getByRole("switch").click(); // click the actual toggle button
  await expect(page.getByText("Only your friends can join")).toBeVisible();
  await page.getByRole("button", { name: "Create New Game" }).click();
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
  await senderPage.getByRole("button", { name: "Add Friend" }).click();
  await senderPage.getByPlaceholder("Search by username or display name...").fill(receiverUsername);
  await expect(senderPage.getByText(`@${receiverUsername}`)).toBeVisible();
  await senderPage
    .getByRole("listitem")
    .filter({ hasText: `@${receiverUsername}` })
    .getByRole("button", { name: "Add Friend" })
    .click();

  // receiver accepts
  await receiverPage.getByRole("link", { name: "Friends" }).click();
  await receiverPage.getByRole("button", { name: "Pending" }).click();
  await receiverPage.getByRole("button", { name: "Accept" }).click();
  await receiverPage.getByRole("button", { name: "Friends" }).click();
  await expect(
    receiverPage.locator("li").filter({ hasText: new RegExp(senderUsername) }),
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
    await expect(page2.locator("li").filter({ hasText: new RegExp(username1) })).toHaveCount(1, {
      timeout: 10000,
    });
    // Then check for the dot
    const friendEntry = page2.locator("li").filter({ hasText: new RegExp(username1) });
    await expect(friendEntry.locator(".status-dot--online")).toBeVisible({ timeout: 10000 });
  });

  test("status updates propagate to friends in real time", async () => {
    // user1 sets status to DND
    await page1.getByLabel("Set activity status").click();
    await page1.getByText("⛔ Do Not Disturb").click();

    // user2 should see DND dot on friends page
    await page2.getByRole("link", { name: "Friends" }).click();
    const friendEntry = page2.locator("li").filter({ hasText: new RegExp(username1) });
    await expect(friendEntry.locator(".status-dot--dnd")).toBeVisible({ timeout: 10000 });
  });
});

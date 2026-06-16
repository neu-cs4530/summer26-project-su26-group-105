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

async function makeFriends(
  senderPage: Page,
  senderUsername: string,
  receiverPage: Page,
  receiverUsername: string,
) {
  await senderPage.getByRole("link", { name: "Friends" }).click();
  await senderPage.getByRole("button", { name: "Search Users" }).click();
  await senderPage.getByPlaceholder("Search by username or display name...").fill(receiverUsername);
  await expect(senderPage.getByText(`@${receiverUsername}`)).toBeVisible();
  await senderPage
    .getByRole("row")
    .filter({ hasText: `@${receiverUsername}` })
    .getByRole("button", { name: "Add Friend" })
    .click();

  await receiverPage.getByRole("link", { name: "Friends" }).click();
  await receiverPage.getByRole("button", { name: "Pending" }).click();
  await receiverPage.getByRole("button", { name: "Accept" }).click();
  await receiverPage.getByRole("button", { name: "Friends" }).click();
  await expect(
    receiverPage.getByRole("row").filter({ hasText: new RegExp(senderUsername) }),
  ).toBeVisible({ timeout: 5000 });
}

async function navigateToMessaging(page: Page) {
  await page.getByRole("link", { name: "Messaging" }).click();
  await page.waitForURL("/forum");
  await page.getByRole("button", { name: "Direct Messages" }).click();
  await expect(page.getByText("Conversations")).toBeVisible({ timeout: 8000 });
}

// removing a friend tests
test.describe("Remove friend", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
    await makeFriends(page1, username1, page2, username2);
  });

  test("removing a friend removes them from the friends list", async () => {
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1
      .getByRole("row")
      .filter({ hasText: new RegExp(username2) })
      .locator("button[aria-label='More options']")
      .click();
    await expect(page1.getByText("Remove Friend 🚩")).toBeVisible({ timeout: 5000 });
    await page1.getByRole("button", { name: /Remove Friend/i }).click();
    await page1.getByRole("button", { name: "OK" }).click();
    await page1.waitForTimeout(2000); // wait for socket update

    // if the friendship was removed, page2 also loses it
    await page2.getByRole("link", { name: "Friends" }).click();
    await expect(page2.getByText(/No friends yet/)).toBeVisible({ timeout: 10000 });
  });

  test("removed user no longer sees the other in their friends list", async () => {
    await page1.getByRole("link", { name: "Friends" }).click();
    await page1
      .getByRole("row")
      .filter({ hasText: new RegExp(username2) })
      .getByRole("button", { name: "More options" })
      .click();
    await expect(page1.getByText("Remove Friend 🚩")).toBeVisible({ timeout: 3000 });
    await page1.getByRole("button", { name: /Remove Friend/i }).click();
    await page1.getByRole("button", { name: "OK" }).click();

    await page2.getByRole("link", { name: "Friends" }).click();
    await expect(page2.getByRole("row").filter({ hasText: new RegExp(username1) })).not.toBeVisible(
      { timeout: 10000 },
    );
  });
});

// game notifications tests
test.describe("Game notifications", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
    await makeFriends(page1, username1, page2, username2);
  });

  test("user gets notification when friend creates a game", async () => {
    await page1.getByRole("link", { name: "Games", exact: true }).click();
    await page1.getByRole("button", { name: "Create New Game" }).click();
    await page1.waitForURL("/game/new");
    await page1.locator(".newGameEntry").filter({ hasText: "Nim" }).click();
    await page1.waitForURL(/\/game\/.+/);

    await expect(page2.locator(".notification-popup").first()).toBeVisible({ timeout: 8000 });
  });
});

// direct messaging tests
test.describe("Direct messaging", () => {
  let username1: string;
  let username2: string;

  test.beforeEach(async () => {
    const user1 = await createUser(page1);
    const user2 = await createUser(page2);
    username1 = user1.username;
    username2 = user2.username;
    await makeFriends(page1, username1, page2, username2);
  });

  test("messaging page loads with no active conversation", async () => {
    await navigateToMessaging(page1);
    await expect(page1.getByText("No Active Conversation Selected")).toBeVisible();
  });

  test("user can search for and start a DM with another user", async () => {
    await navigateToMessaging(page1);
    await page1.getByPlaceholder("Search users to message...").fill(username2);
    await expect(
      page1.locator(".dm-search-result-item").filter({ hasText: username2 }),
    ).toBeVisible({ timeout: 5000 });
    await page1.locator(".dm-search-result-item").filter({ hasText: username2 }).click();
    await expect(page1.locator(".channel-pill-item").filter({ hasText: username2 })).toBeVisible();
  });

  test("user can send a message in a DM", async () => {
    await navigateToMessaging(page1);
    await page1.getByPlaceholder("Search users to message...").fill(username2);
    await expect(
      page1.locator(".dm-search-result-item").filter({ hasText: username2 }),
    ).toBeVisible({ timeout: 5000 });
    await page1.locator(".dm-search-result-item").filter({ hasText: username2 }).click();

    await page1.getByPlaceholder("Type your message...").fill("Hello from user1!");
    await page1.getByRole("button", { name: "Send" }).click();

    await expect(page1.getByText("Hello from user1!")).toBeVisible();
  });

  test("recipient sees message sent by friend", async () => {
    await navigateToMessaging(page1);
    await page1.getByPlaceholder("Search users to message...").fill(username2);
    await expect(
      page1.locator(".dm-search-result-item").filter({ hasText: username2 }),
    ).toBeVisible({ timeout: 5000 });
    await page1.locator(".dm-search-result-item").filter({ hasText: username2 }).click();
    await page1.getByPlaceholder("Type your message...").fill("Hey there!");
    await page1.getByRole("button", { name: "Send" }).click();

    await navigateToMessaging(page2);
    await expect(page2.locator(".channel-pill-item").filter({ hasText: username1 })).toBeVisible({
      timeout: 8000,
    });
    await page2.locator(".channel-pill-item").filter({ hasText: username1 }).click();
    await expect(page2.getByText("Hey there!")).toBeVisible({ timeout: 5000 });
  });

  test("user can create a group chat", async () => {
    await navigateToMessaging(page1);
    await page1.getByRole("button", { name: "+ New Group" }).click();
    await expect(page1.getByPlaceholder("Group name...")).toBeVisible();

    await page1.getByPlaceholder("Group name...").fill("Test Group");
    await page1.getByPlaceholder("Search users to add...").fill(username2);
    await expect(
      page1.locator(".dm-search-result-item").filter({ hasText: username2 }),
    ).toBeVisible({ timeout: 5000 });
    await page1.locator(".dm-search-result-item").filter({ hasText: username2 }).click();

    await page1.getByRole("button", { name: "Create Group" }).click();
    await expect(page1.locator(".channel-pill-item").filter({ hasText: "Test Group" })).toBeVisible(
      { timeout: 5000 },
    );
  });

  test("two users can have a back-and-forth conversation", async () => {
    await navigateToMessaging(page1);
    await page1.getByPlaceholder("Search users to message...").fill(username2);
    await expect(
      page1.locator(".dm-search-result-item").filter({ hasText: username2 }),
    ).toBeVisible({ timeout: 5000 });
    await page1.locator(".dm-search-result-item").filter({ hasText: username2 }).click();
    await page1.getByPlaceholder("Type your message...").fill("Hello!");
    await page1.getByRole("button", { name: "Send" }).click();

    await navigateToMessaging(page2);
    await expect(page2.locator(".channel-pill-item").filter({ hasText: username1 })).toBeVisible({
      timeout: 8000,
    });
    await page2.locator(".channel-pill-item").filter({ hasText: username1 }).click();
    await expect(page2.getByText("Hello!")).toBeVisible({ timeout: 5000 });
    await page2.getByPlaceholder("Type your message...").fill("Hey back!");
    await page2.getByRole("button", { name: "Send" }).click();

    await expect(page1.getByText("Hey back!")).toBeVisible({ timeout: 8000 });
  });
});

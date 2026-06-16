import { test, expect, type Page } from "@playwright/test";

//creates a new account and leaves the user logged in on the home page.
async function signUpAndLogIn(page: Page, username: string) {
  const password = `pwd${username}`;

  await page.goto("/login");
  await page.getByRole("button", { name: "Create New Account" }).click();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  await page.waitForURL("/");
}

//mocks the leaderboard backend route so the UI can be tested
async function mockLeaderboardRows(page: Page, currentUsername: string) {
  await page.route("**/api/leaderboard/list?**", async (route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get("type");

    if (type === "nim") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            rank: 1,
            status: "Gold",
            user: {
              username: currentUsername,
              display: "Current Player",
              decorations: [],
              createdAt: new Date(),
            },
            totalGames: 2,
            totalWins: 2,
            gameWins: { nim: 2 },
          },
        ]),
      });
      return;
    }

    if (type === "guess") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            rank: 1,
            status: "Gold",
            user: {
              username: "guessWinner",
              display: "Guess Winner",
              decorations: [],
              createdAt: new Date().toISOString(),
            },
            totalGames: 3,
            totalWins: 1,
            gameWins: { guess: 1 },
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          rank: 1,
          status: "Gold",
          user: {
            username: currentUsername,
            display: "Current Player",
            decorations: [],
            createdAt: new Date().toISOString(),
          },
          totalGames: 5,
          totalWins: 4,
          gameWins: { nim: 2, guess: 2 },
        },
        {
          rank: 2,
          status: "Silver",
          user: {
            username: "otherPlayer",
            display: "Other Player",
            decorations: [],
            createdAt: new Date().toISOString(),
          },
          totalGames: 4,
          totalWins: 2,
          gameWins: { nim: 1, guess: 1 },
        },
      ]),
    });
  });
}

test.describe("Leaderboard UI", () => {
  test("should open the leaderboard page from the sidebar", async ({ page }) => {
    const username = "leaderboardUser" + Math.floor(Math.random() * 1000000);

    await mockLeaderboardRows(page, username);
    await signUpAndLogIn(page, username);

    //goes to the leaderboard page
    await page.getByRole("link", { name: /LeaderBoard|Leaderboard/ }).click();
    await page.waitForURL("/leaderboard");

    //checks that the table is shown with what it's supposed to be
    await expect(page.getByRole("heading", { name: "Global Leaderboard" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Rank" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "User" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total Games" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total Wins" })).toBeVisible();

    await expect(page.getByText("Current Player (you)", { exact: true })).toBeVisible();
    await expect(page.getByText("Other Player", { exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: /Current Player \(you\).*5.*4/ })).toBeVisible();
  });

  test("should switch between global and game specific leaderboard data", async ({ page }) => {
    const username = "leaderboardFilterUser" + Math.floor(Math.random() * 1000000);

    await mockLeaderboardRows(page, username);
    await signUpAndLogIn(page, username);

    await page.getByRole("link", { name: /LeaderBoard|Leaderboard/ }).click();
    await page.waitForURL("/leaderboard");

    await expect(page.getByRole("heading", { name: "Global Leaderboard" })).toBeVisible();
    await expect(page.getByText("Current Player (you)", { exact: true })).toBeVisible();
    await expect(page.getByText("Other Player", { exact: true })).toBeVisible();

    //gets nim game
    await page.getByLabel("Choose Leaderboard").selectOption("nim");
    await expect(page.getByRole("heading", { name: "Nim Leaderboard" })).toBeVisible();
    await expect(page.getByText("Current Player (you)", { exact: true })).toBeVisible();
    await expect(page.getByText("Other Player", { exact: true })).not.toBeVisible();

    //makes sure number guesser leaderboard is shown
    await page.getByLabel("Choose Leaderboard").selectOption("guess");
    await expect(page.getByRole("heading", { name: "Number Guesser Leaderboard" })).toBeVisible();
    await expect(page.getByText("Guess Winner", { exact: true })).toBeVisible();
    await expect(page.getByText("Current Player (you)", { exact: true })).not.toBeVisible();
  });
});

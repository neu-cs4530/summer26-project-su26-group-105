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

test.describe("Leaderboard UI", () => {
  test("should open the leaderboard page from the sidebar", async ({ page }) => {
    const username = "leaderboardUser" + Math.floor(Math.random() * 1000000);

    await signUpAndLogIn(page, username);

    await page.getByRole("link", { name: /LeaderBoard|Leaderboard/ }).click();

    //goes to the leaderboard page
    await page.waitForURL("/leaderboard");

    //checks that the table is shown with what it's supposed to be
    await expect(page.getByRole("heading", { name: "Global Leaderboard" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Rank" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Profile Picture" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Username" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Win Rate" })).toBeVisible();

    await expect(page.getByText("test", { exact: true })).toBeVisible();
    await expect(page.getByText("92%")).toBeVisible();
  });

  test("should switch between global and game specific leaderboard data", async ({ page }) => {
    const username = "leaderboardFilterUser" + Math.floor(Math.random() * 1000000);

    await signUpAndLogIn(page, username);

    await page.getByRole("link", { name: /Leaderboard/ }).click();
    await page.waitForURL("/leaderboard");

    await expect(page.getByRole("heading", { name: "Global Leaderboard" })).toBeVisible();
    await expect(page.getByText("test", { exact: true })).toBeVisible();
    await expect(page.getByText("92%")).toBeVisible();

    //gets nim game
    await page.getByLabel("Choose Leaderboard").selectOption("nim");
    await expect(page.getByRole("heading", { name: "Nim Leaderboard" })).toBeVisible();
    //checks nim player is seen
    await expect(page.getByText("nim player", { exact: true })).toBeVisible();
    await expect(page.getByText("88%")).toBeVisible();
    await expect(page.getByText("test", { exact: true })).not.toBeVisible();

    await page.getByLabel("Choose Leaderboard").selectOption("guess");
    //makes sure number guesser leaderboard is shown
    await expect(page.getByRole("heading", { name: "Number Guesser Leaderboard" })).toBeVisible();
    await expect(page.getByText("guess player", { exact: true })).toBeVisible();
    await expect(page.getByText("80%")).toBeVisible();
    await expect(page.getByText("nim player", { exact: true })).not.toBeVisible();
  });
});

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createAndFinishGuessGame, createUser } from "./testUtils.ts";

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

test.describe("Edit profile page", () => {
  test.beforeEach(async () => {
    await createUser(page1);
  });

  test("allows users to edit their profile", async () => {
    await page1.getByRole("link", { name: "Profile" }).click();

    await page1.getByLabel("Display Name").fill("New Display Name");
    await page1.getByLabel("Bio").fill("This is my new bio.");

    await page1.getByRole("button", { name: "Add New Social Media" }).click();
    await page1.getByLabel("Username").fill("new_social");
    await page1.getByLabel("Link").fill("https://twitter.com/new_social");
    await page1.getByRole("button", { name: "Add", exact: true }).click();

    await page1.getByRole("button", { name: "Edit Profile Image" }).click();
    await page1.getByLabel("Image URL").fill("https://example.com/new_image.jpg");
    await page1.getByRole("button", { name: "Confirm" }).click();

    // Confirm header isn't updated yet
    await expect(page1.getByText("New Display Name")).not.toBeVisible();

    // Confirm social media does now appear outside of modal
    await expect(page1.getByRole("link", { name: "@new_social" })).toBeVisible();

    await page1.getByRole("button", { name: "Save Profile Changes" }).click();

    // Confirm it's now displayed in header
    await expect(page1.getByText("New Display Name")).toBeVisible();
  });

  test("shows error messages for invalid input", async () => {
    await page1.getByRole("link", { name: "Profile" }).click();

    await page1.getByLabel("Display Name").fill("   ");
    await page1.getByRole("button", { name: "Save Profile Changes" }).click();

    await expect(page1.getByText("Display names can't begin or end with whitespace")).toBeVisible();
  });
});

test.describe("Viewing other users' profiles", () => {
  async function addProfileDetails(
    page: Page,
    displayName = "Test User",
    bio = "This is my bio.",
    socialUser = "test_social",
  ) {
    await page.getByRole("link", { name: "Profile" }).click();

    await page.getByLabel("Display Name").fill(displayName);
    await page.getByLabel("Bio").fill(bio);

    await page.getByRole("button", { name: "Add New Social Media" }).click();
    await page.getByLabel("Username").fill(socialUser);
    await page.getByLabel("Link").fill("https://twitter.com/new_social");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await page.getByRole("button", { name: "Edit Profile Image" }).click();
    await page.getByLabel("Image URL").fill("https://example.com/new_image.jpg");
    await page.getByRole("button", { name: "Confirm" }).click();

    await page1.getByRole("button", { name: "Save Profile Changes" }).click();

    await page1.getByRole("link", { name: "Home" }).click();
  }

  async function createGame(page: Page) {
    await page.getByRole("button", { name: "Create New Game" }).click();
    await page.waitForURL("/game/new");
    await page.getByRole("button").filter({ hasText: "Nim" }).click();
  }

  let username1: string;

  test.beforeEach(async () => {
    username1 = (await createUser(page1)).username;
    await createUser(page2);
    await createGame(page1);
  });

  test("displays other users' profile information on their profile", async () => {
    await addProfileDetails(page1, `${username1} Display`);
    await page2.getByRole("link", { name: "Games", exact: true }).click();
    // Trigger clicking without hovering, so we don't accidentally test the hover card
    await page2
      .getByRole("link", { name: `${username1} Display` })
      .first()
      .dispatchEvent("click");

    await expect(page2.getByText("This is my bio.")).toBeVisible();
    await expect(page2.getByRole("link", { name: "@test_social" })).toBeVisible();
  });

  test("displays other users' profile information on hover", async () => {
    await addProfileDetails(page1, `${username1} Display`);
    await page2.getByRole("link", { name: "Games", exact: true }).click();
    await page2
      .getByRole("link", { name: `${username1} Display` })
      .first()
      .hover();

    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2.getByText("This is my bio.")).toBeVisible();
  });

  test("displays recently played games", async () => {
    await addProfileDetails(page1, `${username1} Display`);
    await createAndFinishGuessGame(page1, page2, username1);
    await page2.getByRole("link", { name: "Games", exact: true }).click();
    // Trigger clicking without hovering, so we don't accidentally test the hover card
    await page2
      .getByRole("link", { name: `${username1} Display` })
      .first()
      .dispatchEvent("click");

    await expect(page2.getByText("Number Guesser").first()).toBeVisible();
  });
});

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createAndLoadGame } from "./testUtils.ts";

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

test.describe("The game selection infrastructure", () => {
  test("should support creating a new One game and having a second user join it", async () => {
    await createAndLoadGame(page1, page2, "one", false, true);
  });
});

test.describe("The game of One", () => {
  test.beforeEach(async () => {
    await createAndLoadGame(page1, page2, "one", false, true);
  });

  test("should start with each player having 7 cards", async () => {
    expect(await page1.getByTestId(/hand-card/).count()).toBe(7);
    expect(await page1.getByTestId(/other-hand-1/).count()).toBe(7);

    expect(await page2.getByTestId(/hand-card/).count()).toBe(7);
    expect(await page2.getByTestId(/other-hand-0/).count()).toBe(7);
  });
});

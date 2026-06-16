import { test, expect } from "@playwright/test";
import { createUser } from "./testUtils";

let user: Awaited<ReturnType<typeof createUser>>;

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    user = await createUser(page);
  });

  test("shows notification settings before password settings", async ({ page }) => {
    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Settings" }).click();

    await expect(page.getByRole("heading", { name: "Notification", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Friend Notifications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reset Password", exact: true })).toBeVisible();

    const notificationSettings = page.getByRole("heading", { name: "Notification", exact: true });
    const passwordSettings = page.getByRole("heading", { name: "Reset Password", exact: true });

    await expect(notificationSettings).toBeVisible();
    await expect(passwordSettings).toBeVisible();

    const notificationBox = await notificationSettings.boundingBox();
    const passwordBox = await passwordSettings.boundingBox();

    expect(notificationBox).not.toBeNull();
    expect(passwordBox).not.toBeNull();
    expect(notificationBox!.y).toBeLessThan(passwordBox!.y);
  });

  test("allows users to toggle friend notification settings", async ({ page }) => {
    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Settings" }).click();

    const receiveFriendRequests = page.getByRole("checkbox").first();

    await expect(receiveFriendRequests).toBeChecked();

    await receiveFriendRequests.click();
    await expect(receiveFriendRequests).not.toBeChecked();

    await receiveFriendRequests.click();
    await expect(receiveFriendRequests).toBeChecked();
  });

  test("shows an error when password confirmation does not match", async ({ page }) => {
    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByLabel("New Password", { exact: true }).fill("newpassword123");
    await page.getByLabel("Confirm New Password").fill("differentpassword123");
    await page.getByRole("button", { name: "Save Password" }).click();

    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test("allows users to update their password", async ({ page }) => {
    const newPassword = "newpassword123";

    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByLabel("New Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm New Password").fill(newPassword);
    await page.getByRole("button", { name: "Save Password" }).click();

    await expect(page.getByRole("button", { name: "Password Saved" })).toBeVisible();

    await page.getByRole("button", { name: "Log Out" }).click();

    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Log In" }).click();

    await page.waitForURL("/");
    await expect(page.getByText(`signed in as ${user.username}`)).toBeVisible();
  });
});

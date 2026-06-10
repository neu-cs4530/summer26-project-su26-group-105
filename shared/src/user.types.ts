import { z } from "zod";

/**
 * Represents a "safe" user object that excludes sensitive information like
 * the password, suitable for exposing to clients,
 * - `username`: unique username of the user
 * - `display`: A display name
 * - `createdAt`: when this when the user registered.
 */
export interface SafeUserInfo {
  username: string;
  display: string;
  image: string | null;
  bio: string;
  socialMedias: SocialMedia[];
  settings: {
    receivesFriendRequestNotifications: boolean;
    receivesFriendAcceptedNotifications: boolean;
    receivesGameInviteNotifications: boolean;
    receivesFriendGameActivityNotifications: boolean;
  };
  createdAt: Date;
}

/*** TYPES USED IN THE USER API ***/

/**
 * Represents allowed social medias.
 */
export type SocialMedia = z.infer<typeof zSocialMedia>;
export const zSocialMedia = z.object({
  username: z.string(),
  link: z.url(),
});

/**
 * Represents allowed updates to a user.
 */
export type UserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
export const zUserUpdateRequest = z.object({
  password: z.preprocess(
    (p) => (p === "" ? undefined : p),
    z
      .string()
      .regex(/^\S.*\S$/, { error: "Passwords can't begin or end with whitespace" })
      .optional(),
  ),
  display: z
    .string()
    .min(1, { error: "Please enter a display name" })
    .max(50, { error: "Display names can't be longer than 50 characters" })
    .regex(/^\S.*\S$/, { error: "Display names can't begin or end with whitespace" })
    .optional(),
  image: z
    .preprocess(
      (i) => (i === "" ? null : i),
      z.url({ error: "Please enter a valid image URL" }).nullable(),
    )
    .optional(),
  bio: z.string().max(300, { error: "Bio can't be longer than 300 characters" }).optional(),
  socialMedias: z
    .array(zSocialMedia)
    .max(12, { error: "You may only have up to 12 social media links" })
    .optional(),
  settings: z
    .object({
      receivesFriendRequestNotifications: z.boolean().optional(),
      receivesFriendAcceptedNotifications: z.boolean().optional(),
      receivesGameInviteNotifications: z.boolean().optional(),
      receivesFriendGameActivityNotifications: z.boolean().optional(),
    })
    .optional(),
});

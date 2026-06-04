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
    receivesFriendGameNotifications: boolean;
  };
  createdAt: Date;
}

/*** TYPES USED IN THE USER API ***/

export const zSocialMedia = z.object({
  username: z.string(),
  link: z.url(),
});
export type SocialMedia = z.infer<typeof zSocialMedia>;

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
    .regex(/^\S.*\S$/, { error: "Display names can't begin or end with whitespace" })
    .optional(),
  image: z.url().nullable().optional(),
  bio: z.string().optional(),
  socialMedias: z.array(zSocialMedia).optional(),
  settings: z
    .object({
      receivesFriendRequestNotifications: z.boolean().optional(),
      receivesFriendGameNotifications: z.boolean().optional(),
    })
    .optional(),
});

import { z } from "zod";

export type SocialMedia = {
  username: string;
  link: string;
};

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

const zSocialMedia = z.object({
  username: z.string(),
  link: z.url(),
});

/**
 * Represents allowed updates to a user.
 */
export type UserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
export const zUserUpdateRequest = z.object({
  password: z.string().optional(),
  display: z.string().optional(),
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

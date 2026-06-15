import type { OneAction } from "./one.types.ts";

export const oneAnimationDurations: Record<OneAction["type"], number> = {
  draw: 500,
  play: 300,
};

import { describe, expect, it, beforeEach } from "vitest";
import {
  getStatus,
  setStatus,
  clearStatus,
  getStatusMap,
} from "../../src/services/activityStatus.service.ts";
import { FriendRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { sendFriendRequest, acceptFriendRequest } from "../../src/services/friend.service.ts";
import type { GameServer } from "../../src/types.ts";

// mockIo
interface EmittedEvent {
  room: string;
  event: string;
  payload: unknown;
}

function makeMockIo(): { io: GameServer; emitted: EmittedEvent[] } {
  const emitted: EmittedEvent[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ room, event, payload });
      },
    }),
  } as unknown as GameServer;
  return { io, emitted };
}

// test user IDs
let userAId: string;
let userBId: string;

beforeEach(async () => {
  await FriendRepo.clear();
  await UserRepo.clear();

  await createUser("alice", "pwdA", new Date());
  await createUser("bob", "pwdB", new Date());

  userAId = (await getUserByUsername("alice"))!.userId;
  userBId = (await getUserByUsername("bob"))!.userId;
});

// getStatus tests
describe("getStatus", () => {
  it("returns offline by default for untracked users", () => {
    expect(getStatus("unknown-user")).toBe("offline");
  });

  it("returns the status after it has been set", async () => {
    const { io } = makeMockIo();
    await setStatus(io, userAId, "idle");
    expect(getStatus(userAId)).toBe("idle");
  });
});

// setStatus tests
describe("setStatus", () => {
  it("updates the status map", async () => {
    const { io } = makeMockIo();
    await setStatus(io, userAId, "dnd");
    expect(getStatus(userAId)).toBe("dnd");
  });

  it("emits friendStatusUpdated to friends' rooms", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const { io, emitted } = makeMockIo();
    await setStatus(io, userAId, "idle");

    const statusEvent = emitted.find(
      (e) => e.event === "friendStatusUpdated" && e.room === `friend-${userBId}`,
    );
    expect(statusEvent).toBeDefined();
    expect(statusEvent?.payload).toMatchObject({ status: "idle" });
  });

  it("does not emit to non-friends", async () => {
    const { io, emitted } = makeMockIo();
    await setStatus(io, userAId, "online");

    const toB = emitted.filter((e) => e.room === `friend-${userBId}`);
    expect(toB).toHaveLength(0);
  });

  it("emits to multiple friends", async () => {
    await createUser("carol", "pwdC", new Date());
    const userCId = (await getUserByUsername("carol"))!.userId;

    const { friendId: f1 } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(f1, userBId);
    const { friendId: f2 } = (await sendFriendRequest(userAId, userCId)) as { friendId: string };
    await acceptFriendRequest(f2, userCId);

    const { io, emitted } = makeMockIo();
    await setStatus(io, userAId, "dnd");

    const rooms = emitted.map((e) => e.room);
    expect(rooms).toContain(`friend-${userBId}`);
    expect(rooms).toContain(`friend-${userCId}`);
  });
});

// clearStatus tests
describe("clearStatus", () => {
  it("removes the user from the status map", async () => {
    const { io } = makeMockIo();
    await setStatus(io, userAId, "online");
    expect(getStatus(userAId)).toBe("online");

    await clearStatus(io, userAId);
    expect(getStatus(userAId)).toBe("offline");
  });

  it("emits offline status to friends on clear", async () => {
    const { friendId } = (await sendFriendRequest(userAId, userBId)) as { friendId: string };
    await acceptFriendRequest(friendId, userBId);

    const { io, emitted } = makeMockIo();
    await setStatus(io, userAId, "online");
    await clearStatus(io, userAId);

    const offlineEvent = emitted.find(
      (e) =>
        e.event === "friendStatusUpdated" &&
        e.room === `friend-${userBId}` &&
        (e.payload as { status: string }).status === "offline",
    );
    expect(offlineEvent).toBeDefined();
  });
});

// getStatusMap tests
describe("getStatusMap", () => {
  it("returns offline for all untracked users", () => {
    const map = getStatusMap([userAId, userBId]);
    expect(map[userAId]).toBe("offline");
    expect(map[userBId]).toBe("offline");
  });

  it("returns correct statuses for tracked users", async () => {
    const { io } = makeMockIo();
    await setStatus(io, userAId, "online");
    await setStatus(io, userBId, "dnd");

    const map = getStatusMap([userAId, userBId]);
    expect(map[userAId]).toBe("online");
    expect(map[userBId]).toBe("dnd");
  });

  it("handles empty array", () => {
    expect(getStatusMap([])).toStrictEqual({});
  });
});

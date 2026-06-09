import { describe, expect, it, beforeEach, vi } from "vitest";
import { GameRepo, UserRepo } from "../../src/repository.ts";
import { createUser } from "../../src/services/user.service.ts";
import { socketAddBot } from "../../src/controllers/game.controller.ts";
import { createGame } from "../../src/services/game.service.ts";
import { type GameServer, type GameServerSocket } from "../../src/types.ts";

let hostUserId: string;
let mockSocket: unknown;
let mockIo: unknown;

beforeEach(async () => {
  await GameRepo.clear();
  await UserRepo.clear();
  vi.useFakeTimers();

  const { getUserByUsername } = await import("../../src/services/auth.service.ts");

  await createUser("hostUser", "password", new Date());
  const hostProfile = await getUserByUsername("hostUser");
  hostUserId = hostProfile!.userId;

  mockSocket = {
    join: vi.fn(),
    emit: vi.fn(),
    rooms: new Set<string>(),
  };

  mockIo = {
    to: vi.fn().mockImplementation(() => ({
      emit: vi.fn(),
    })),
  };
});

describe("Bot Server Controller Integration Tests", () => {
  describe("socketAddBot Lobby", () => {
    it("adds a formatted bot player ID directly to the database game roster", async () => {
      const gameInfo = await createGame(
        { userId: hostUserId, username: "hostUser" },
        "one",
        new Date(),
      );

      // Construct a valid client request payload
      const payload = {
        auth: { username: "hostUser", password: "password" },
        payload: gameInfo.gameId,
      };

      // Invoke the socket handler
      const handler = socketAddBot(mockSocket as GameServerSocket, mockIo as GameServer);
      await handler(payload);

      // Verify the player list in the database now contains the bot
      const updatedGame = await GameRepo.get(gameInfo.gameId);
      expect(updatedGame.players).toHaveLength(2);
      expect(updatedGame.players[1]).toSatisfy((id: string) => id.startsWith("bot_"));
    });

    it("rejects bot generation requests if the user is not the room host", async () => {
      await createUser("maliciousUser", "pwd", new Date());
      const gameInfo = await createGame(
        { userId: hostUserId, username: "hostUser" },
        "one",
        new Date(),
      );

      const payload = {
        auth: { username: "maliciousUser", password: "pwd" },
        payload: gameInfo.gameId,
      };

      const handler = socketAddBot(mockSocket as GameServerSocket, mockIo as GameServer);
      await handler(payload);

      // Roster count must remain unchanged
      const currentGame = await GameRepo.get(gameInfo.gameId);
      expect(currentGame.players).toHaveLength(1);
    });

    it("blocks bot assignments if the target match is not the 'One' card game", async () => {
      const nimGameInfo = await createGame(
        { userId: hostUserId, username: "hostUser" },
        "nim",
        new Date(),
      );

      const payload = {
        auth: { username: "hostUser", password: "password" },
        payload: nimGameInfo.gameId,
      };

      const handler = socketAddBot(mockSocket as GameServerSocket, mockIo as GameServer);
      await handler(payload);

      const currentGame = await GameRepo.get(nimGameInfo.gameId);
      expect(currentGame.players).toHaveLength(1);
    });
  });
});

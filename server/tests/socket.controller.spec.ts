import { describe, it, expect, vi } from "vitest";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import type { GameServerSocket } from "../src/types.ts";

describe("logSocketError", () => {
  it("logs Error message for Error instances", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockSocket = { id: "test-socket" } as unknown as GameServerSocket;

    logSocketError(mockSocket, new Error("test error"));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("test error"));
    consoleSpy.mockRestore();
  });

  it("logs JSON for non-Error objects", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockSocket = { id: "test-socket" } as unknown as GameServerSocket;

    logSocketError(mockSocket, { code: 42 });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("42"));
    consoleSpy.mockRestore();
  });
});

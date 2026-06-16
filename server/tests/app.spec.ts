import { afterEach, beforeEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as ioc, type Socket } from "socket.io-client";
import { httpServer } from "../src/app.ts";

const PORT = 3099;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    if (httpServer.listening) return resolve();
    httpServer.listen(PORT, resolve);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

let clientSocket: Socket;

beforeEach(async () => {
  clientSocket = ioc(`http://localhost:${PORT}`);
  await new Promise<void>((resolve) => clientSocket.once("connect", resolve));
});

afterEach(async () => {
  if (clientSocket.connected) clientSocket.disconnect();
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
});

function emit(event: string, payload: unknown): Promise<void> {
  return new Promise((resolve) => {
    clientSocket.emit(event, payload);
    setTimeout(resolve, 150);
  });
}

// tests for app socket connections and handlers
describe("app.ts socket connection", () => {
  it("accepts a socket connection", () => {
    expect(clientSocket.connected).toBe(true);
  });

  it("handles chatJoin event", async () => {
    await emit("chatJoin", { auth: { username: "user1", password: "pwd1111" }, payload: "bad-id" });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles friendList event", async () => {
    await emit("friendList", { auth: { username: "user1", password: "pwd1111" }, payload: {} });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles friendSearch event", async () => {
    await emit("friendSearch", {
      auth: { username: "user1", password: "pwd1111" },
      payload: { query: "user", type: "all" },
    });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles gameWatch event", async () => {
    await emit("gameWatch", {
      auth: { username: "user1", password: "pwd1111" },
      payload: "bad-id",
    });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles userConnect event", async () => {
    await emit("userConnect", { auth: { username: "user1", password: "pwd1111" }, payload: {} });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles setStatus event", async () => {
    await emit("setStatus", {
      auth: { username: "user1", password: "pwd1111" },
      payload: { status: "idle" },
    });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles registerUserSession event", async () => {
    await emit("registerUserSession", { auth: { username: "user1" }, payload: "user1" });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles openDirectChat event", async () => {
    await emit("openDirectChat", {
      auth: { username: "user1", password: "pwd1111" },
      payload: "user2",
    });
    expect(clientSocket.connected).toBe(true);
  });

  it("handles malformed event payload gracefully", async () => {
    await emit("chatJoin", "not-an-object");
    expect(clientSocket.connected).toBe(true);
  });

  it("disconnects cleanly", async () => {
    expect(clientSocket.connected).toBe(true);
    clientSocket.disconnect();
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    expect(clientSocket.connected).toBe(false);
  });
});

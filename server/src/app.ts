/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import * as http from "node:http";
import * as chat from "./controllers/chat.controller.ts";
import * as friend from "./controllers/friend.controller.ts";
import * as game from "./controllers/game.controller.ts";
import * as user from "./controllers/user.controller.ts";
import * as thread from "./controllers/thread.controller.ts";
import * as leaderboard from "./controllers/leaderboard.controller.ts";
import { type GameServer, type GameServerSocket } from "./types.ts";
import { clearStatus } from "./services/activityStatus.service.ts";
import {
  socketOpenDirectChat,
  socketCreateGroupChat,
  socketSendChatMessage,
  socketRegisterUserSession,
} from "./controllers/dms.controller.ts";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

app.use(express.json());

app.use(
  "/api",
  Router()
    .use("/leaderboard", express.Router().get("/list", leaderboard.getList))
    .use(
      "/game",
      express
        .Router() //
        .post("/create", game.postCreate)
        .get("/list", game.getList)
        .get("/:id", game.getById),
    )
    .use(
      "/thread",
      express
        .Router() //
        .post("/create", thread.postCreate)
        .get("/list", thread.getList)
        .get("/:id", thread.getById)
        .post("/:id/comment", thread.postByIdComment),
    )
    .use(
      "/user",
      Router() // Any concrete routes here should be disallowed as usernames
        .post("/list", user.postList)
        .post("/login", user.postLogin)
        .post("/signup", user.postSignup)
        .post("/:username", user.postByUsername)
        .get("/:username", user.getByUsername)
        .get("/:username/recently-played", user.getRecentlyPlayed),
    ),
);

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`CONN [${socketId}] connected`);

  socket.on("disconnect", () => {
    console.log(`CONN [${socketId}] disconnected`);
  });

  socket.on("chatJoin", chat.socketJoin(socket, io));
  socket.on("chatLeave", chat.socketLeave(socket, io));
  socket.on("chatSendMessage", chat.socketSendMessage(socket, io));

  socket.on("friendList", friend.socketList(socket, io));
  socket.on("friendRequest", friend.socketRequest(socket, io));
  socket.on("friendAccept", friend.socketAccept(socket, io));
  socket.on("friendDecline", friend.socketDecline(socket, io));
  socket.on("friendRemove", friend.socketRemove(socket, io));
  socket.on("friendBlock", friend.socketBlock(socket, io));
  socket.on("friendUnblock", friend.socketUnblock(socket, io));
  socket.on("friendSearch", friend.socketSearch(socket, io));
  socket.on("setStatus", friend.socketSetStatus(socket, io));
  socket.on("userConnect", friend.socketUserConnect(socket, io));

  socket.on("gameJoinAsPlayer", game.socketJoinAsPlayer(socket, io));
  socket.on("gameMakeMove", game.socketMakeMove(socket, io));
  socket.on("gameStart", game.socketStart(socket, io));
  socket.on("gameWatch", game.socketWatch(socket, io));
  socket.on("friendGameCreated", game.socketFriendGameCreated(socket, io));

  socket.on("gameAddBot", game.socketAddBot(socket, io));

  socket.on("gameAddBot", game.socketAddBot(socket, io));

  //DM stuff
  socket.on("registerUserSession", (userId) => {
    void socketRegisterUserSession(socket)(userId);
  });

  socket.on("openDirectChat", (body) => {
    void (async () => {
      await socketOpenDirectChat(socket, io)(body);
    })();
  });

  socket.on("createGroupChat", (body) => {
    void (async () => {
      await socketCreateGroupChat(socket, io)(body);
    })();
  });

  socket.on("sendChatMessage", (body) => {
    void (async () => {
      await socketSendChatMessage(socket, io)(body);
    })();
  });

  socket.onAny((name, payload) => {
    const zPayload = z.object({ auth: z.object({ username: z.string() }), payload: z.any() });
    const checked = zPayload.safeParse(payload);

    if (checked.error) {
      console.log(`RECV error: ${checked.error.message}`);
    } else {
      console.log(
        `RECV [${socketId}] got ${name}${checked.data.auth.username} ${JSON.stringify(checked.data.payload)}`,
      );
    }
  });
  socket.onAnyOutgoing((name) => {
    console.log(`SEND [${socketId}] gets ${name}`);
  });
  socket.on("disconnect", async () => {
    console.log(`CONN [${socketId}] disconnected`);
    const userId = (socket as GameServerSocket).userId;
    if (userId) {
      await clearStatus(io, userId);
    }
  });
});

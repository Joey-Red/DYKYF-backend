const express = require("express");
const router = express.Router();
var cors = require("cors");
const app = express();
const http = require("http").createServer(app);
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

app.use(bodyParser.json());

dotenv.config();
const mongoDb = process.env.MONGODB_URI;
mongoose
  .connect(mongoDb, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.log(err));
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const questions = require("./questions");

const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.static("public"));
app.use(router); // Add this line
const existingRooms = new Set();
const playersInRoom = new Map();
const playersWhoSubmittedAnswers = new Map();
const playerUsernames = new Map();
io.on("connection", function (socket) {
  socket.on("disconnect", function () {
    console.log(`user ${socket.id} disconnected`);
    playersInRoom.forEach((playersSet, roomName) => {
      if (playersSet.has(socket.id)) {
        playersSet.delete(socket.id);
        // Remove the room from the existingRooms set if there are no more players in it
        if (playersSet.size === 0) {
          existingRooms.delete(roomName);
        }
        // Remove the player's ID from the playersWhoSubmittedAnswers map
        if (playersWhoSubmittedAnswers.has(roomName)) {
          playersWhoSubmittedAnswers.get(roomName).delete(socket.id);
        }
        // Remove the player's ID from the playerUsernames map
        if (playerUsernames.has(socket.id)) {
          playerUsernames.delete(socket.id);
        }
        // Emit an event to update the players object in the room
        const playersObject = {};
        playersInRoom.forEach((playersSet, roomName) => {
          playersObject[roomName] = Array.from(playersSet);
        });
        io.in(roomName).emit("players", playersObject);
      }
    });
  });

  socket.on("create room", (roomName) => {
    if (existingRooms.has(roomName)) {
      socket.emit("roomNameTaken", { error: "Room name already taken" });
    } else {
      socket.join(roomName);
      existingRooms.add(roomName);
      if (!playersInRoom.has(roomName)) {
        playersInRoom.set(roomName, new Set());
      }
      playersInRoom.get(roomName).add(socket.id);
      socket.emit("roomCreated", { message: "success" });
      const playersObject = {};
      playersInRoom.forEach((playersSet, roomName) => {
        playersObject[roomName] = Array.from(playersSet);
      });
      socket.emit("players", playersObject);
      console.log(`user ${socket.id} created room ${roomName}`);
    }
  });

  socket.on("join room", function (roomName) {
    console.log(`user ${socket.id} is trying to join room ${roomName}`);
    if (existingRooms.has(roomName)) {
      console.log(`user ${socket.id} joined room ${roomName}`);
      socket.join(roomName);
      // add the user to the playersInRoom Map
      if (!playersInRoom.has(roomName)) {
        playersInRoom.set(roomName, new Set());
      }
      playersInRoom.get(roomName).add(socket.id);
      socket.emit("joinedRoomSuccess", { message: `joined room ${roomName}` });
      const playersObject = {};
      playersInRoom.forEach((playersSet, roomName) => {
        playersObject[roomName] = Array.from(playersSet);
      });
      socket.emit("players", playersObject);
      // io.to(roomName).emit("room members update", getRoomMembers(roomName));
    } else {
      socket.emit("joinedRoomFail", { message: "room doesnt exist" });
    }
  });

  io.on("connection", (socket) => {
    // socket.on("chat message", (data, roomName) => {
    //   // console.log(data, roomName);
    //   const { id, message, username } = data;
    //   io.to(roomName).emit("chat message", { id, message, username });
    // });
  });
  socket.on("all players ready", (data) => {
    // console.log(data);
    const roomSize = playersWhoSubmittedAnswers.get(data.roomName).size;
    io.to(data.roomName).emit("start game", roomSize);
  });
  socket.on("player moved", (data) => {
    // console.log(data);
    // io.to(data.roomName).emit(data);

    io.in(data.roomName).emit("update player", {
      data: data,
    });
  });
  socket.on("submitAnswers", (data) => {
    const {
      roomName,
      questionOne,
      answerOne,
      questionTwo,
      answerTwo,
      questionThree,
      answerThree,
      username,
    } = data;
    // console.log(data);
    // if (username !== "Anon") {
    //   // EMIT A SOCKET FUNCTION TO CHANGE USERNAME
    //   playerUsernames.set(socket.id, username);
    // }
    if (!playersWhoSubmittedAnswers.has(roomName)) {
      playersWhoSubmittedAnswers.set(roomName, new Set());
    }
    playersWhoSubmittedAnswers.get(roomName).add(socket.id);

    const playersInRoomCount = playersInRoom.get(roomName).size;
    const playersWhoSubmittedAnswersCount =
      playersWhoSubmittedAnswers.get(roomName).size;
    if (
      playersWhoSubmittedAnswersCount === playersInRoomCount &&
      playersInRoomCount >= 2
    ) {
      // Get the username for each player who submitted answers
      const playerUsernamesArray = Array.from(
        playersWhoSubmittedAnswers.get(roomName)
      ).map((playerId) => {
        return playerUsernames.get(playerId);
      });
      // Emit an event with the usernames for all players who submitted answers
      io.in(roomName).emit("allPlayersReady", {
        message: "all players are ready",
        playerUsernames: playerUsernamesArray,
      });
    }
  });
});

router.get("/get-questions", (req, res) => {
  try {
    let num1 = Math.floor(Math.random() * (70 - 1 + 1) + 1);
    let num2 = Math.floor(Math.random() * (70 - 1 + 1) + 1);
    let num3 = Math.floor(Math.random() * (70 - 1 + 1) + 1);

    // check if the numbers are the same, and regenerate if necessary
    while (num2 === num1) {
      num2 = Math.floor(Math.random() * (70 - 1 + 1) + 1);
    }

    while (num3 === num1 || num3 === num2) {
      num3 = Math.floor(Math.random() * (70 - 1 + 1) + 1);
    }
    res.json([questions[num1], questions[num2], questions[num3]]);
  } catch (err) {
    // code to handle the error
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

http.listen(port, function () {
  console.log(`listening on *:${port}`);
});

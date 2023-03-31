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
io.on("connection", function (socket) {
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
  // socket.on("getPlayersWhoSubmittedAnswers", (roomName) => {
  //   const playersWhoSubmittedAnswersForRoom =
  //     playersWhoSubmittedAnswers.get(roomName) || new Set();
  //   socket.emit("playersWhoSubmittedAnswers", {
  //     players: Array.from(playersWhoSubmittedAnswersForRoom),
  //   });
  // });
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
    } else {
      socket.emit("joinedRoomFail", { message: "room doesnt exist" });
    }
  });
  socket.on("chat message", (message, roomName) => {
    console.log(message, roomName);
    socket.to(roomName).emit("chat message", message);
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
    } = data;
    console.log(data);
    // if (data.username !== "Anon"){
    //   // EMIT A SOCKET FUNCTION TO CHANGE USERNAME
    // }
    if (!playersWhoSubmittedAnswers.has(roomName)) {
      playersWhoSubmittedAnswers.set(roomName, new Set());
    }
    playersWhoSubmittedAnswers.get(roomName).add(socket.id);

    const playersInRoomCount = playersInRoom.get(roomName).size;
    const playersWhoSubmittedAnswersCount =
      playersWhoSubmittedAnswers.get(roomName).size;
    console.log(playersInRoomCount, playersWhoSubmittedAnswersCount);
    if (playersWhoSubmittedAnswersCount === playersInRoomCount) {
      io.in(roomName).emit("allPlayersReady", {
        message: "all players are ready",
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

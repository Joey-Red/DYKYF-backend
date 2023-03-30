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
io.on("connection", function (socket) {
  console.log("a user connected");

  socket.on("create room", function (roomName) {
    console.log(`user ${socket.id} created room ${roomName}`);
    socket.join(roomName);
  });
  socket.on("join room", function (roomName) {
    console.log(`user ${socket.id} joined room ${roomName}`);
    socket.join(roomName);
  });
  socket.on("chat message", (message, roomName) => {
    console.log(message, roomName);
    socket.to(roomName).emit("chat message", message);
  });
  socket.on("disconnect", function () {
    console.log("user disconnected");
  });
});

router.post("/post-answers", (req, res, next) => {
  console.log(req.body);
  // if (err) {
  //   res.sendStatus(403);
  // } else{}
  //     ).then((result) => {
  //       console.log(result);
  //     });
  //     res.json(200);
  //   });
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

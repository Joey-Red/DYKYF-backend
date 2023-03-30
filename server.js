const express = require("express");
const router = express.Router();
var cors = require("cors");
const app = express();
const http = require("http").createServer(app);
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
router.get("/get-question", (req, res) => {
  try {
    let qNum = Math.floor(Math.random() * 80);
    res.json(questions[qNum]);
  } catch (err) {
    // code to handle the error
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

http.listen(port, function () {
  console.log(`listening on *:${port}`);
});

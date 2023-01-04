import http, { Server } from "http";
import SocketIO from "socket.io"
import express from "express";
import cors from "cors";

// const { userJoin, getUsers, userLeave } = require("./utils/user");

const app = express();
const server = http.createServer(app);
const io = SocketIO(server);

let imageUrl, userRoom;


//! 원래 "./utils/user" 에서 export 해왔떤 것..
const users = [];

// Join user to chat
const userJoin = (id, username, room, host, presenter) => {
  const user = { id, username, room, host, presenter };

  users.push(user);
  return user;
};
// User leaves chat
const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

//get users
const getUsers = (room) => {
  const RoomUsers = [];
  users.map((user) => {
    if (user.room == room) {
      RoomUsers.push(user);
    }
  });

  return RoomUsers;
};

// module.exports = {
//   userJoin,
//   userLeave,
//   getUsers,
// };



//! 내 코드 였던 것
// const httpServer = http.createServer(app); 
// const wsServer = SocketIO(httpServer); 

//! app.use 셋팅
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use("/public", express.static(__dirname + "/public"));


//! 아래 둘 중 하나는 사용 
// app.get("/", (req, res) => {
//   res.send("server");
// });
app.get("/", (req,res) => res.sendFile(__dirname +"/public/index.html"));


//! socket.io

io.on("connection", (socket) => {
  socket.on("user-joined", (data) => {
    const { roomId, userId, userName, host, presenter } = data;
    userRoom = roomId;
    const user = userJoin(socket.id, userName, roomId, host, presenter);
    const roomUsers = getUsers(user.room);
    socket.join(user.room);
    socket.emit("message", {
      message: "Welcome to ChatRoom",
    });
    socket.broadcast.to(user.room).emit("message", {
      message: `${user.username} has joined`,
    });

    io.to(user.room).emit("users", roomUsers);
    io.to(user.room).emit("canvasImage", imageUrl);
  });

  socket.on("drawing", (data) => {
    imageUrl = data;
    socket.broadcast.to(userRoom).emit("canvasImage", imageUrl);
  });

  socket.on("disconnect", () => {
    const userLeaves = userLeave(socket.id);
    const roomUsers = getUsers(userRoom);

    if (userLeaves) {
      io.to(userLeaves.room).emit("message", {
        message: `${userLeaves.username} left the chat`,
      });
      io.to(userLeaves.room).emit("users", roomUsers);
    }
  });

  socket.on("join_room", (roomName, newSocket) => {
    socket.join(roomName);
    socket.to(roomName).emit("welcome", newSocket);
  });
  
  //고참 소켓의 서버
  socket.on("offer", (offer, roomName, newSocket, oldSocket ) => {
    // socket.to(roomName).emit("offer", offer);
    socket.to(newSocket).emit("offer", offer, oldSocket);
  });

  // 신참 소켓의 서버
  socket.on("answer", (answer, roomName, oldSocket, newSocket) => {
    // socket.to(roomName).emit("answer", answer);
    socket.to(oldSocket).emit("answer", answer, newSocket);
  });

  socket.on("ice", (ice, roomName, peerSocket) => {
    socket.to(roomName).emit("ice", ice);
    // socket.to(peerSocket).emit("ice", ice);
  });


});

// serve on port
// const PORT = process.env.PORT || 8080;
// server.listen(PORT, () =>
//   console.log(`server is listening on http://localhost:${PORT}`)
// );

const handleListen = () => console.log("✅ server starts! Enjoy your RealTime Communication");
server.listen(8080, handleListen);  



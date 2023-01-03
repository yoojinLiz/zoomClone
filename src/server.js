import http, { Server } from "http";
// import WebSocket from "ws"; //! 추가
import SocketIO from "socket.io"
import express from "express";

const app = express(); 

// app.set("view engine", "pug");
// app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

// app.get("/", (req,res) => res.render("home"));
app.get("/", (req,res) => res.sendFile(__dirname +"/public/index.html"));
const handleListen = () => console.log("✅ server starts!", __dirname);

const httpServer = http.createServer(app); 
const wsServer = SocketIO(httpServer); 

wsServer.on("connection", (socket) => {
  socket.on("join_room", (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit("welcome");
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
});

httpServer.listen(3000, handleListen);  



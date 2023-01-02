import http, { Server } from "http";
// import WebSocket from "ws"; //! 추가
import SocketIO from "socket.io"
import express from "express";

const app = express(); 

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req,res) => res.render("home"));
const handleListen = () => console.log("✅ server starts!", __dirname);

const httpServer = http.createServer(app); 
const wsServer = SocketIO(httpServer); 

wsServer.on("connection", (socket) => {
  
  socket.on("enter_room", (room_name, user_name, done) => {
    socket['username'] = user_name;
    socket.join(room_name);
    done();
    socket.to(room_name).emit("welcome", socket['username']);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach(room => socket.to(room).emit("bye", socket['username']))
  })
  
  socket.on("new_message", (msg, room, username, done)=> {
    socket.to(room).emit("new_message", username, msg);
    done();
  });
})

httpServer.listen(3000, handleListen);  
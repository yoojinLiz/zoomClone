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


// public room 찾는 함수
function publicRooms() {
  // 아래 두 줄 대신에
  //	const sids = wsServer.sockets.adapter.sids; 
  //	const rooms = wsServer.sockets.adapter.rooms;

  //! 아래와 같이 한방에 처리 가능 :-) ES6! 👍
    const {sockets: {
        adapter: {sids, rooms},
      },
    } = wsServer; 
    const publicRooms = [];
    rooms.forEach((_, key) => {
      if(sids.get(key) === undefined) {
        publicRooms.push(key)
      }
  })
    return publicRooms;
  }


wsServer.on("connection", (socket) => {
  socket.onAny((event) => {
    console.log(wsServer.sockets.adapter);
  });
  
  socket.on("enter_room", (room_name, user_name, done) => {
    socket['username'] = user_name;
    socket.join(room_name);
    done();
    socket.to(room_name).emit("welcome", socket['username']); // 하나의 룸으로 보내는 emit
    wsServer.sockets.emit("room_change", publicRooms()); // 모~든 룸으로 보내는 emit! 
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach(room => socket.to(room).emit("bye", socket['username']))
  })
  
  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms()); // 모~든 룸으로 보내는 emit! 
  })
  
  socket.on("new_message", (msg, room, username, done)=> {
    socket.to(room).emit("new_message", username, msg);
    done();
  });
})

httpServer.listen(3000, handleListen);  
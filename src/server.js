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

httpServer.listen(3000, handleListen);  
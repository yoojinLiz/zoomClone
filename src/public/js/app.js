const socket = io()

const welcome = document.getElementById("welcome");
const room = document.getElementById("room");
const room_num = document.getElementById("room_num");
const nickname = document.getElementById("nickname");
// const form = welcome.querySelector("form");

let roomName;
let username;
room.hidden = true;

function showRoom() {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;

	const form = room.querySelector("form");
  form.addEventListener("submit", handleMessageSubmit);
}

function addMessage(username, msg) {
	const ul = room.querySelector("ul")
	const li = document.createElement("li") 
	li.innerText = `${username} : ${msg}`
	ul.appendChild(li)
}

function handleMessageSubmit (event) {
	event.preventDefault();
	const input = room.querySelector("input");
  value = input.value
	socket.emit("new_message", value, roomName, username, () => {
		addMessage(username, value);
});
  input.value = "";	
}

function handleRoomSubmit(event) {
  event.preventDefault();
  // const input = form.querySelector("input");
  roomName = room_num.value;
  username = nickname.value;
  socket.emit("enter_room", roomName, username, showRoom);
  room_num.value = "";
  nickname.value = "";
}

// 백엔드에서 보내는 이벤트들에 대한 응답 처리
socket.on("welcome", (user) => {addMessage(user, " joined!")} ); 
socket.on("bye", (user) => {addMessage(user, " left ㅠㅠ")} ); 
socket.on("new_message", (user, msg) => {addMessage(user, msg)} );
socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";
	if(rooms.length === 0) {
		return;
	}
  rooms.forEach(room => {
    const li = document.createElement("li");
    const div = document.createElement("button");
    li.innerText = room; 
    div.append(li);
    roomList.append(div); 
    }
    )
  })

//  방 번호 입력 후 제출하면 handleRoomSubmit 함수 실행 
welcome.addEventListener("submit", handleRoomSubmit);
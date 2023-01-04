const socket = io()
console.log("나는 소켓이야 🛎🛎🛎 \n",socket);

const myFace = document.getElementById("myFace"); // video 화면
const muteBtn = document.getElementById("mute"); 
const muteIcon = document.getElementById("muteIcon"); 
const cameraBtn = document.getElementById("camera");
const cameraIcon = document.getElementById("cameraIcon");
const camerasSelect = document.getElementById("cameras"); // 카메라 선택 select 요소

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

const call = document.getElementById("call");
call.hidden = true;


async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput"); // 여러 미디어 요소중 videoinput (카메라) 요소만 찾아서 cameras 라는 배열에 넣는다 
    console.log(myStream.getVideoTracks());
    const currentCamera = myStream.getVideoTracks()[0]; // 현재 비디오가 송출되는 카메라 
    /* currentCamera 정보 중 일부 예시 
    id : "a23fcc40-36e8-49b2-8b68-8ac3d5c03242"
    label : "FaceTime HD Camera"
    */
    cameras.forEach((camera) => { // 카메라 요소 각각을 select의 선택 요소로 만들어서 넣어준다. 
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label; // e.g. FaceTime HD Camera

      if (currentCamera.label === camera.label) { // 현재 카메라와 일치하는 카메라는
        option.selected = true; // 자동으로 디폴트 선택 되도록
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = { // 초기 contrains 설정 
    audio: true,
    video: { facingMode: "user" }, // 핸드폰 화면일때 전면 카메라가 기본값이 되도록 
  };
  const cameraConstraints = { // 인자로 deviceId가 들어왔을 때의 설정 
    audio: true,
    video: { deviceId: { exact: deviceId } }, // 입력한 deviceId가 카메라가 되도록 함 
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream; // 비디오에 송출될 화면은 스트림~! 
    if (!deviceId) {
      await getCameras(); // 최초 시작일 때 
    }
  } catch (e) {
    console.log(e);
  }
}


function handleMuteClick() {
  myStream
  .getAudioTracks()
  .forEach((track) => (track.enabled = !track.enabled)); // 오디오 요소를 키고 끄기
  if (!muted) {
    // muteBtn.innerText = "Unmute";
    muted = true;
    muteIcon.classList.remove('fa-microphone-slash')
    muteIcon.classList.add('fa-microphone')

  } else {
    // muteBtn.innerText = "Mute";
    muted = false;
    muteIcon.classList.remove('fa-microphone')
    muteIcon.classList.add('fa-microphone-slash')
  }
}
function handleCameraClick() {
  myStream
  .getVideoTracks()
  .forEach((track) => (track.enabled = !track.enabled)); // 카메라 화면 요소를 키고 끄기 
  if (!cameraOff) {
    cameraOff = true;
    cameraIcon.classList.remove('fa-circle-xmark');
    cameraIcon.classList.add('fa-carmera');

  } else {
    cameraOff = false;
    cameraIcon.classList.remove('fa-carmera');
    cameraIcon.classList.add('fa-circle-xmark');
  }
}
async function handleCameraChange() {
  await getMedia(camerasSelect.value); // 설정을 바꿀 때는 값이 있을 거고, 맨 처음 기본으로 시작할 때는 아무 값도 없을 것. 
  if (myPeerConnection) {
		const videoTrack = myStream.getVideoTracks()[0] //! 새로운 디바이스 아이디로 받은 스트림을 videoTrack에 저장하고!
		const videoSender = myPeerConnection
			.getSenders()
			.find((sender) => sender.track.kind ==="video");	
		videoSender.replaceTrack(videoTrack); //! 이 비디오 트랙으로 replaceTrack을 하자! 
	}
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange); // 선택하는 카메라가 바뀔때마다 스트림 새로 받아오게 함 

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  console.log("나는 소켓 id야 🛎🛎🛎 \n", socket.id);
  const newSocket = socket.id
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value, newSocket );
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

//! Socket Code (먼저 방에 참여하고 있는 브라우저들에게 적용되는 코드)
socket.on("welcome", async (newSocket) => {
  console.log("받은 socket: ", newSocket);
  const oldSocket = socket.id;
  console.log("내 socket: ", socket.id);
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName, newSocket, oldSocket); // socket.id는 내 소켓 
  console.log("sent the offer");
});

//! Socket Code (새로 방에 참여하려고 하는 브라우저들에게 적용되는 코드)
socket.on("offer", async (offer, oldSocket) => {
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName, oldSocket, socket.id);
  console.log("sent the answer");
}); 

//! Socket Code (먼저 방에 참여하고 있는 브라우저들에게 적용되는 코드)
socket.on("answer", (answer, newSocket) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
  socket.mypeer = newSocket; 
  console.log("진실의 순간.... 🪞🪞🪞🪞🪞🪞🪞: ", socket.mypeer);
})

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
  });
  
// RTC

// RTC Code
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myPeerConnection.addEventListener("track", handleTrack);
  
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleTrack(data) {
  console.log("handle track");
  const peerFace = document.querySelector("#peerFace");
  const peerFace2 = document.querySelector("#peerFace2");
  const peerFace3 = document.querySelector("#peerFace3");
  const peerFace4 = document.querySelector("#peerFace4");
  peerFace.srcObject = data.streams[0];
  peerFace2.srcObject = data.streams[0];
  peerFace3.srcObject = data.streams[0];
  peerFace4.srcObject = data.streams[0];
}

function handleIce(data) {
  /* 
  ! 이 data를 console.log 해보면 여러 개의 candidates가 찍힘
  ! 누군가가 조인 하는 순간 양쪽 브라우저 모두 자신의 candidates들을 콘솔에 찍는다! */
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName, socket.mypeer);
}

function handleAddStream(data) {
  //!나의 스트림은 myStream 이고, data.stream은 상대의 스트림이다!
  const peerStream = document.getElementById("peerStream");
  console.log("data : 🔑🔑🔑", data);
  console.log("data : 🎀", data.stream);
  
  const videoElem = document.createElement("video");
  videoElem.id = "peerFace";
  videoElem.autoplay= true;
  videoElem.playsinline = true;
  peerStream.appendChild(videoElem);
  console.log("why...🧐🧐🧐", videoElem)
  videoElem.srcObject = data.stream;

}





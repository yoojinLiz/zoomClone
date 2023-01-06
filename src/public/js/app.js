const socket = io()

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
let myPeerConnection = {} ;
let myDataChannel;
let recentPeer; 

const call = document.getElementById("call");
call.hidden = true;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput"); // 여러 미디어 요소중 videoinput (카메라) 요소만 찾아서 cameras 라는 배열에 넣는다 
    // console.log(myStream.getVideoTracks());
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

//! 방 번호 입력하는 from 을 숨겨주고, 미디어를 불러와서 학습창을 켜는 부분 
async function initCall() { 
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  console.log("나의 소켓🚀 id :", socket.id);
  const newSocket = socket.id
  const input = welcomeForm.querySelector("input");
  await initCall(); // 학습 창 켜기 
  socket.emit("join_room", input.value, newSocket);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

//! Socket Code (먼저 방에 참여하고 있는 브라우저들에게 적용되는 코드)
socket.on("welcome", async (newSocket) => {
  makeConnection(newSocket); // 새로운 커넥션 생성 
  const conn = myPeerConnection[newSocket];
  // console.log("welcome - peer connection 확인", conn);  //! makeConnection 내에서 찍어본 함수와 동일한 것 확인 완료 
  const oldSocket = socket.id;
  // console.log("new socket: ", newSocket);
  // console.log("me = old socket: ", oldSocket);
  
  //?
  myDataChannel = conn.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => console.log(event.data));

  const offer = await conn.createOffer();
  conn.setLocalDescription(offer);
  socket.emit("offer", offer, roomName, newSocket, oldSocket); 
  console.log("sent the offer");
});

//! Socket Code (새로 방에 참여하려고 하는 브라우저들에게 적용되는 코드)
socket.on("offer", async (offer, oldSocket) => {
  console.log("🍎🍎🍎🍎 test", socket)
  makeConnection(oldSocket);
  const conn = myPeerConnection[oldSocket];
  // console.log("offer - peer connection 확인", conn); //! makeConnection 내에서 찍어본 함수와 동일한 것 확인 완료 
  
  conn.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => console.log(event.data));
  });

  console.log("received the offer: ");
  conn.setRemoteDescription(offer);
  const answer = await conn.createAnswer();
  conn.setLocalDescription(answer);
  socket.emit("answer", answer, roomName, oldSocket, socket.id);
  console.log("sent the answer");
  recentPeer = oldSocket;
  console.log("recentPeer!!!", recentPeer)

  const divElement = document.getElementById('peerStream');
  const videoElement = divElement.lastElementChild;
  videoElement.setAttribute('id', recentPeer);

}); 

//! Socket Code (먼저 방에 참여하고 있는 브라우저들에게 적용되는 코드)
socket.on("answer", (answer, newSocket) => {
  console.log("🍎🍎🍎🍎 test", socket)
  console.log("received the answer");
  const conn = myPeerConnection[newSocket];
  conn.setRemoteDescription(answer);
  recentPeer = newSocket;
})

socket.on("ice", (ice, currSocket) => {
  if (ice) {
      console.log("received candidate");
      const conn = myPeerConnection[currSocket]
      conn.addIceCandidate(ice);
    };
});

socket.on("bye", (socketLeft) => {
  console.log("삭제할 소켓 id" , socketLeft);
  const conn = myPeerConnection[socketLeft]
  const videoElement = document.getElementById(socketLeft.socketId);
  console.dir(videoElement);
  videoElement.remove();
  conn.close(); // webRTC peerconnection 종료 
})

  
// RTC Code
function makeConnection(socket) {
  const newPeerConnection = new RTCPeerConnection({
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

  if (socket !== ''){
    myPeerConnection[socket] = newPeerConnection ;
  }
  newPeerConnection.addEventListener("icecandidate", handleIce);
  newPeerConnection.addEventListener("track", handleTrack);
  
  myStream
    .getTracks()
    .forEach((track) => newPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  /* 
  ! 이 data를 console.log 해보면 여러 개의 candidates가 찍힘
  ! 누군가가 조인 하는 순간 양쪽 브라우저 모두 자신의 candidates들을 콘솔에 찍는다! */
  console.log("sent candidate");
  // console.log("ICE🐳🐳🐳 candidate data : ",data);

  // sid는 socketId, connection 은 PeerConnection 
  for (const [sid, connection] of Object.entries(myPeerConnection)) {
    if (connection === data.target) {
      socket.emit("ice", data.candidate, sid, socket.id);
    }
  }
}

function handleTrack(data) {
  // console.log("handle-track data : 🎀", data);
  // console.log("handle-track data.streams : 🎀", data.streams[0]);
  if (data.track.kind === 'video') {
    const peerStream = document.getElementById("peerStream");
    const videoElem = document.createElement("video");
    // videoElem.id = "peerFace";
    
    videoElem.autoplay= true;
    videoElem.playsinline = true;
    peerStream.appendChild(videoElem);
    videoElem.srcObject = data.streams[0];
    console.log("recent Peer in handleTrack!!!🔔🔔🔔" , recentPeer);
    videoElem.id = recentPeer;
  }
}

// window.onbeforeunload = function() {  //! 창 뒤로 가기 누를 때 알림창으로 정말 나갈 것인지 물어봄
//   return "Are you sure you want to leave this page?"; 
// }

// 제대로 안되고 있는 것 같음 ㅠㅠㅠㅠㅠㅠㅠㅠ
window.addEventListener('beforeunload', (event) => {
  // Do something, such as send an AJAX request to the server
  socket.disconnect();
  // socket.emit("test")
});
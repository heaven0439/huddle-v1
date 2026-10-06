// frontend/js/meeting.js
import { getAuthToken } from "./api.js";
import {
  initializeLocalStream,
  toggleHardwareAudio,
  toggleHardwareVideo,
  stopLocalStream,
  toggleScreenShare,
} from "./webrtc.js";
import { connectSignalingServer, sendSignalingMessage } from "./websocket.js";

const displayRoomCode = document.getElementById("display-room-code");
const copyLinkBtn = document.getElementById("copy-link-btn");
const leaveMeetingBtn = document.getElementById("leave-meeting-btn");
const meetingClock = document.getElementById("meeting-clock");

const toggleMicBtn = document.getElementById("toggle-mic-btn");
const toggleCamBtn = document.getElementById("toggle-cam-btn");
const toggleScreenBtn = document.getElementById("toggle-screen-btn");
const toggleHandBtn = document.getElementById("toggle-hand-btn");
const reactionBtn = document.getElementById("reaction-btn");

// NEW: Chat UI Elements
const toggleChatBtn = document.getElementById("toggle-chat-btn");
const chatPanel = document.getElementById("chat-panel");
const closeChatBtn = document.getElementById("close-chat-btn");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatUnreadBadge = document.getElementById("chat-unread-badge");

let isMicMuted = false;
let isCamOff = false;
let isScreenSharing = false;
let isHandRaised = false;

async function initMeeting() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("room");

  if (!roomCode) {
    alert("Invalid meeting link.");
    window.location.href = "dashboard.html";
    return;
  }

  displayRoomCode.textContent = roomCode;
  startMeetingClock();

  let userName = "Guest";
  try {
    const response = await fetch("http://localhost:8000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const userData = await response.json();
      userName = userData.name;
    }
  } catch (error) {}

  const streamSuccess = await initializeLocalStream(userName);
  if (streamSuccess) connectSignalingServer(roomCode, userName);

  copyLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const originalColor = copyLinkBtn.style.color;
      copyLinkBtn.style.color = "#3b82f6";
      setTimeout(() => (copyLinkBtn.style.color = originalColor), 2000);
    });
  });

  leaveMeetingBtn.addEventListener("click", () => {
    stopLocalStream();
    window.location.href = "dashboard.html";
  });
}

function startMeetingClock() {
  setInterval(() => {
    meetingClock.textContent = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, 1000);
}

// --- Control Bar Logic ---
toggleMicBtn.addEventListener("click", () => {
  isMicMuted = !isMicMuted;
  toggleHardwareAudio(isMicMuted);
  toggleMicBtn.classList.toggle("danger-state");
  const micIcon = document.getElementById("mic-icon");
  micIcon.innerHTML = isMicMuted
    ? `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`
    : `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
});

toggleCamBtn.addEventListener("click", () => {
  isCamOff = !isCamOff;
  toggleHardwareVideo(isCamOff);
  toggleCamBtn.classList.toggle("danger-state");

  const localWrapper = document.getElementById("local-video-wrapper");
  localWrapper.classList.toggle("camera-off", isCamOff);
  sendSignalingMessage({ type: "camera-state", isOff: isCamOff });

  const camIcon = document.getElementById("cam-icon");
  camIcon.innerHTML = isCamOff
    ? `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 17.16V7l-7 5v-.16l-4.5-3.21L6 6.13V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.84l4-2.84v9.32z"></path><path d="M14 14.73V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-.43.14-.83.37-1.15"></path>`
    : `<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>`;
});

toggleScreenBtn.addEventListener("click", async () => {
  isScreenSharing = await toggleScreenShare();
  toggleScreenBtn.style.backgroundColor = isScreenSharing
    ? "#3b82f6"
    : "#44474a";
  toggleScreenBtn.style.borderColor = isScreenSharing
    ? "#3b82f6"
    : "transparent";
});

toggleHandBtn.addEventListener("click", () => {
  isHandRaised = !isHandRaised;
  sendSignalingMessage({ type: "raise-hand", isRaised: isHandRaised });
  document
    .querySelectorAll(`[data-client-id="local"]`)
    .forEach((w) => w.classList.toggle("hand-raised", isHandRaised));
  toggleHandBtn.style.backgroundColor = isHandRaised ? "#3b82f6" : "#44474a";
});

reactionBtn.addEventListener("click", () => {
  const emojis = ["👍", "🎉", "❤️", "👏", "😂"];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  sendSignalingMessage({ type: "reaction", emoji: randomEmoji });

  const wrapper = document.getElementById("local-video-wrapper");
  const emojiEl = document.createElement("div");
  emojiEl.className = "reaction-emoji";
  emojiEl.textContent = randomEmoji;
  wrapper.appendChild(emojiEl);
  setTimeout(() => emojiEl.remove(), 2000);
});

// --- NEW: Live Chat Logic ---
function toggleChat() {
  chatPanel.classList.toggle("open");
  if (chatPanel.classList.contains("open")) {
    chatUnreadBadge.style.display = "none"; // Clear notifications when opened
    chatInput.focus();
  }
}

toggleChatBtn.addEventListener("click", toggleChat);
closeChatBtn.addEventListener("click", toggleChat);

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Broadcast message to everyone in the room
  sendSignalingMessage({ type: "chat", text: text });

  // Print message on your own screen
  const msgEl = document.createElement("div");
  msgEl.className = "chat-message self";
  msgEl.innerHTML = `
        <div class="chat-sender">You <span class="chat-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="chat-text">${text}</div>
    `;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom

  chatInput.value = "";
});

initMeeting();

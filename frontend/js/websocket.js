// frontend/js/websocket.js
import {
  handleNewUser,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  handleUserLeft,
  updateUserCount,
} from "./webrtc.js";

let socket = null;
let currentRoom = null;
let currentClientId = null;
let currentUserName = "Guest";

export const activePresentations = new Set();

export function connectSignalingServer(roomCode, userName) {
  currentRoom = roomCode;
  currentUserName = userName || "Guest";
  currentClientId = Math.random().toString(36).substring(2, 15);

  const wsUrl = `ws://localhost:8000/ws/${roomCode}/${currentClientId}`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () =>
    console.log(`✅ Connected to signaling server for room: ${roomCode}`);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.sender_id === currentClientId) return;
    if (message.target_id && message.target_id !== currentClientId) return;

    if (message.type === "user-joined") handleNewUser(message.client_id);
    if (message.type === "offer")
      handleOffer(message.offer, message.sender_id, message.sender_name);
    if (message.type === "answer")
      handleAnswer(message.answer, message.sender_id, message.sender_name);
    if (message.type === "ice-candidate")
      handleIceCandidate(message.candidate, message.sender_id);
    if (message.type === "user-left")
      handleUserLeft(message.client_id || message.sender_id);

    if (message.type === "camera-state") {
      const wrappers = document.querySelectorAll(
        `[data-client-id="${message.sender_id}"]`,
      );
      wrappers.forEach((w) => {
        if (!w.classList.contains("is-screen-share"))
          w.classList.toggle("camera-off", message.isOff);
      });
    }
    if (message.type === "raise-hand") {
      const wrappers = document.querySelectorAll(
        `[data-client-id="${message.sender_id}"]`,
      );
      wrappers.forEach((w) =>
        w.classList.toggle("hand-raised", message.isRaised),
      );
    }
    if (message.type === "reaction") {
      const wrapper = document.querySelector(
        `[data-client-id="${message.sender_id}"]:not(.is-screen-share)`,
      );
      if (wrapper) {
        const emoji = document.createElement("div");
        emoji.className = "reaction-emoji";
        emoji.textContent = message.emoji;
        wrapper.appendChild(emoji);
        setTimeout(() => emoji.remove(), 2000);
      }
    }

    if (message.type === "presentation-start") {
      activePresentations.add(message.streamId);
      document.getElementById("video-grid").classList.add("presentation-mode");
      const wrapper = document.getElementById(`wrapper-${message.streamId}`);
      if (wrapper) {
        wrapper.classList.add("is-screen-share");
        const label = wrapper.querySelector(".name-text");
        if (label) label.textContent += " (Presentation)";
      }
    }
    if (message.type === "presentation-stop") {
      activePresentations.delete(message.streamId);
      const wrapper = document.getElementById(`wrapper-${message.streamId}`);
      if (wrapper) wrapper.remove();
      if (activePresentations.size === 0) {
        document
          .getElementById("video-grid")
          .classList.remove("presentation-mode");
      }
    }

    // NEW: Live Chat Routing
    if (message.type === "chat") {
      const chatMessages = document.getElementById("chat-messages");
      if (chatMessages) {
        const msgEl = document.createElement("div");
        msgEl.className = "chat-message other";
        msgEl.innerHTML = `
                    <div class="chat-sender">${message.sender_name} <span class="chat-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                    <div class="chat-text">${message.text}</div>
                `;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom

        // Trigger Unread Badge if chat is closed
        const chatPanel = document.getElementById("chat-panel");
        if (!chatPanel.classList.contains("open")) {
          const badge = document.getElementById("chat-unread-badge");
          if (badge) badge.style.display = "flex";
        }
      }
    }
  };
  socket.onerror = (error) => console.error("WebSocket Error:", error);
}

export function sendSignalingMessage(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    message.sender_id = currentClientId;
    message.sender_name = currentUserName;
    socket.send(JSON.stringify(message));
  }
}

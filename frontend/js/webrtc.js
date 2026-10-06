// frontend/js/webrtc.js
import { sendSignalingMessage, activePresentations } from "./websocket.js";

let localStream = null;
let screenStream = null;
const peerConnections = {};

const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

export function updateUserCount() {
  const count = Object.keys(peerConnections).length + 1;
  const el = document.getElementById("user-count");
  if (el) el.textContent = count;
}

export async function initializeLocalStream(userName) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });

    const videoContainer = document.getElementById("local-video-wrapper");
    const videoElement = document.createElement("video");
    videoElement.srcObject = localStream;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;

    videoContainer.appendChild(videoElement);

    const label = document.createElement("div");
    label.className = "participant-label";
    label.innerHTML = `<span class="hand-raised-icon">✋</span> You`;
    videoContainer.appendChild(label);

    const initial =
      userName && userName !== "Guest" ? userName.charAt(0).toUpperCase() : "Y";
    document.getElementById("local-avatar").textContent = initial;

    return true;
  } catch (error) {
    console.error("Error accessing media devices.", error);
    return false;
  }
}

function createPeerConnection(remoteClientId, remoteUserName) {
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections[remoteClientId] = pc;
  updateUserCount();

  // Attach Camera
  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }
  // Attach Screen if already sharing
  if (screenStream) {
    screenStream.getTracks().forEach((track) => {
      pc.screenSender = pc.addTrack(track, screenStream);
    });
  }

  // Mid-call renegotiation logic for adding/removing dual streams
  pc.onnegotiationneeded = async () => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignalingMessage({
        type: "offer",
        offer: pc.localDescription,
        target_id: remoteClientId,
      });
    } catch (e) {
      console.error("Negotiation error:", e);
    }
  };

  // Handle incoming video streams dynamically
  pc.ontrack = (event) => {
    const stream = event.streams[0];
    const streamId = stream.id;

    if (document.getElementById(`wrapper-${streamId}`)) return;

    const videoGrid = document.getElementById("video-grid");
    const wrapper = document.createElement("div");
    wrapper.className = "video-wrapper";
    wrapper.id = `wrapper-${streamId}`;
    wrapper.setAttribute("data-client-id", remoteClientId);

    const isScreen = activePresentations.has(streamId);
    if (isScreen) {
      wrapper.classList.add("is-screen-share");
      videoGrid.classList.add("presentation-mode");
    }

    const initial = remoteUserName
      ? remoteUserName.charAt(0).toUpperCase()
      : "G";
    const labelText = isScreen
      ? `${remoteUserName} (Presentation)`
      : remoteUserName;

    wrapper.innerHTML = `
            <div class="avatar-placeholder">${initial}</div>
            <video id="video-${streamId}" autoplay playsinline></video>
            <div class="participant-label">
                <span class="hand-raised-icon">✋</span> 
                <span class="name-text">${labelText || "Connecting..."}</span>
            </div>
        `;
    videoGrid.appendChild(wrapper);
    document.getElementById(`video-${streamId}`).srcObject = stream;
  };

  pc.onicecandidate = (event) => {
    if (event.candidate)
      sendSignalingMessage({
        type: "ice-candidate",
        candidate: event.candidate,
        target_id: remoteClientId,
      });
  };
  return pc;
}

export async function handleNewUser(remoteClientId) {
  // Negotiation handles the offer logic
  createPeerConnection(remoteClientId, "Connecting...");
}

export async function handleOffer(offer, remoteClientId, remoteUserName) {
  let pc = peerConnections[remoteClientId];
  if (!pc) pc = createPeerConnection(remoteClientId, remoteUserName);

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignalingMessage({
    type: "answer",
    answer: pc.localDescription,
    target_id: remoteClientId,
  });
}

export async function handleAnswer(answer, remoteClientId, remoteUserName) {
  const pc = peerConnections[remoteClientId];
  if (pc) {
    // Update labels for all streams belonging to this client
    const wrappers = document.querySelectorAll(
      `[data-client-id="${remoteClientId}"]`,
    );
    wrappers.forEach((w) => {
      const labelText = w.querySelector(".name-text");
      const avatar = w.querySelector(".avatar-placeholder");
      if (avatar && remoteUserName)
        avatar.textContent = remoteUserName.charAt(0).toUpperCase();
      if (labelText && remoteUserName) {
        labelText.textContent = w.classList.contains("is-screen-share")
          ? `${remoteUserName} (Presentation)`
          : remoteUserName;
      }
    });
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

export async function handleIceCandidate(candidate, remoteClientId) {
  const pc = peerConnections[remoteClientId];
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export function handleUserLeft(remoteClientId) {
  const wrappers = document.querySelectorAll(
    `[data-client-id="${remoteClientId}"]`,
  );
  wrappers.forEach((w) => {
    if (w.classList.contains("is-screen-share")) {
      activePresentations.delete(w.id.replace("wrapper-", ""));
      if (activePresentations.size === 0)
        document
          .getElementById("video-grid")
          .classList.remove("presentation-mode");
    }
    w.remove();
  });

  if (peerConnections[remoteClientId]) {
    peerConnections[remoteClientId].close();
    delete peerConnections[remoteClientId];
  }
  updateUserCount();
}

export function toggleHardwareAudio(isMuted) {
  if (localStream && localStream.getAudioTracks().length > 0)
    localStream.getAudioTracks()[0].enabled = !isMuted;
}

export function toggleHardwareVideo(isCamOff) {
  if (localStream && localStream.getVideoTracks().length > 0)
    localStream.getVideoTracks()[0].enabled = !isCamOff;
}

export function stopLocalStream() {
  if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  Object.values(peerConnections).forEach((pc) => pc.close());
}

export async function toggleScreenShare() {
  if (!screenStream) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      sendSignalingMessage({
        type: "presentation-start",
        streamId: screenStream.id,
      });

      const videoGrid = document.getElementById("video-grid");
      videoGrid.classList.add("presentation-mode");

      const wrapper = document.createElement("div");
      wrapper.className = "video-wrapper is-screen-share";
      wrapper.id = `wrapper-${screenStream.id}`;
      wrapper.setAttribute("data-client-id", "local");
      wrapper.innerHTML = `
                <video id="video-${screenStream.id}" autoplay playsinline></video>
                <div class="participant-label">You (Presentation)</div>
            `;
      videoGrid.appendChild(wrapper);
      document.getElementById(`video-${screenStream.id}`).srcObject =
        screenStream;

      // Trigger renegotiation to push dual streams
      Object.values(peerConnections).forEach((pc) => {
        pc.screenSender = pc.addTrack(screenTrack, screenStream);
      });

      screenTrack.onended = () => stopScreenShare();
      return true;
    } catch (error) {
      return false;
    }
  } else {
    stopScreenShare();
    return false;
  }
}

function stopScreenShare() {
  if (screenStream) {
    sendSignalingMessage({
      type: "presentation-stop",
      streamId: screenStream.id,
    });

    const wrapper = document.getElementById(`wrapper-${screenStream.id}`);
    if (wrapper) wrapper.remove();

    if (!document.querySelector(".is-screen-share")) {
      document
        .getElementById("video-grid")
        .classList.remove("presentation-mode");
    }

    screenStream.getTracks().forEach((t) => t.stop());

    Object.values(peerConnections).forEach((pc) => {
      if (pc.screenSender) {
        pc.removeTrack(pc.screenSender);
        delete pc.screenSender;
      }
    });
    screenStream = null;
  }

  const screenBtn = document.getElementById("toggle-screen-btn");
  if (screenBtn) {
    screenBtn.style.backgroundColor = "#44474a";
    screenBtn.style.borderColor = "transparent";
  }
}

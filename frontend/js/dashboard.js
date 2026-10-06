// frontend/js/dashboard.js
import { apiRequest, getAuthToken, clearAuthToken } from "./api.js";

const userGreeting = document.getElementById("user-greeting");
const userAvatar = document.getElementById("user-avatar");
const currentDate = document.getElementById("current-date");
const liveClock = document.getElementById("live-clock");
const logoutBtn = document.getElementById("logout-btn");
const createMeetingBtn = document.getElementById("create-meeting-btn");
const joinBtn = document.getElementById("join-btn");
const joinCodeInput = document.getElementById("join-code-input");

function startClock() {
  function update() {
    const now = new Date();
    liveClock.textContent = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    currentDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  update();
  setInterval(update, 1000);
}

async function initDashboard() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "index.html"; // Removed leading slash
    return;
  }

  startClock();

  try {
    const userData = await apiRequest("/users/me", "GET");
    const firstName = userData.name.split(" ")[0];
    const formattedName =
      firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    userGreeting.textContent = `Welcome back, ${formattedName}.`;
    userAvatar.textContent = formattedName.charAt(0);
  } catch (error) {
    console.error("Authentication failed:", error);
    clearAuthToken();
    window.location.href = "index.html"; // Removed leading slash
  }
}

logoutBtn.addEventListener("click", () => {
  clearAuthToken();
  window.location.href = "index.html"; // Removed leading slash
});

createMeetingBtn.addEventListener("click", async () => {
  createMeetingBtn.disabled = true;
  createMeetingBtn.innerHTML = "Creating...";

  try {
    const response = await apiRequest("/meetings/create", "POST");
    // Removed leading slash so it works securely inside the frontend folder
    window.location.href = `meeting.html?room=${response.room_code}`;
  } catch (error) {
    console.error("Failed to create meeting:", error);
    alert("Server error: Could not create meeting.");
    createMeetingBtn.disabled = false;
    createMeetingBtn.innerHTML = "Start Instant Meeting";
  }
});

joinBtn.addEventListener("click", () => {
  const code = joinCodeInput.value.trim();
  if (code) {
    window.location.href = `meeting.html?room=${code}`; // Removed leading slash
  } else {
    alert("Please enter a valid meeting code or link.");
  }
});

joinCodeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinBtn.click();
  }
});

initDashboard();

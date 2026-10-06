// frontend/js/ui.js

const authModal = document.getElementById("auth-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const authWrapper = document.getElementById("auth-wrapper");

// Triggers for opening the modal
const navLoginBtn = document.getElementById("nav-login-btn");
const navSignupBtn = document.getElementById("nav-signup-btn");
const newMeetingBtn = document.getElementById("new-meeting-btn");

// Sliding Panel Buttons (Desktop)
const slideToSignupBtn = document.getElementById("slide-to-signup");
const slideToLoginBtn = document.getElementById("slide-to-login");

// Text Link Toggles (Mobile)
const mobileToSignupBtn = document.getElementById("mobile-to-signup");
const mobileToLoginBtn = document.getElementById("mobile-to-login");

/**
 * Opens the modal and selects the correct panel
 */
function openAuthModal(isSignup = false) {
  authModal.classList.add("active");
  if (isSignup) {
    authWrapper.classList.add("right-panel-active");
  } else {
    authWrapper.classList.remove("right-panel-active");
  }
}

/**
 * Closes the modal
 */
function closeAuthModal() {
  authModal.classList.remove("active");
}

/**
 * Initialize all Event Listeners
 */
function initUI() {
  // Open modal events
  navLoginBtn.addEventListener("click", () => openAuthModal(false));
  navSignupBtn.addEventListener("click", () => openAuthModal(true));
  newMeetingBtn.addEventListener("click", () => openAuthModal(true));

  // Close modal events
  closeModalBtn.addEventListener("click", closeAuthModal);

  // Close if clicking outside the wrapper
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) {
      closeAuthModal();
    }
  });

  // Desktop Sliding logic
  if (slideToSignupBtn) {
    slideToSignupBtn.addEventListener("click", () => {
      authWrapper.classList.add("right-panel-active");
    });
  }
  if (slideToLoginBtn) {
    slideToLoginBtn.addEventListener("click", () => {
      authWrapper.classList.remove("right-panel-active");
    });
  }

  // Mobile Toggle logic
  if (mobileToSignupBtn) {
    mobileToSignupBtn.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent the # link from jumping to top of page
      authWrapper.classList.add("right-panel-active");
    });
  }
  if (mobileToLoginBtn) {
    mobileToLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      authWrapper.classList.remove("right-panel-active");
    });
  }
}

// Run initialization
initUI();

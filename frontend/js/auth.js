// frontend/js/auth.js
import { setAuthToken } from "./api.js";

// 1. Initialize Firebase (Replace with your exact config from the console)
import { firebaseConfig } from "./firebase-config.js";

firebase.initializeApp(firebaseConfig);

// 2. Attach the Google Login popup to our buttons
const googleBtns = document.querySelectorAll(".google-login-btn");

googleBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
      // Trigger the Google popup
      const result = await firebase.auth().signInWithPopup(provider);

      // Get the secure JWT from Firebase
      const idToken = await result.user.getIdToken();

      // Send this token to our Python backend to verify and sync with SQLite
      const response = await fetch("http://localhost:8000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      if (response.ok) {
        const data = await response.json();
        // Save the session token and route to dashboard
        setAuthToken(data.access_token);
        window.location.href = "dashboard.html";
      } else {
        const errorData = await response.json();
        alert(`Backend error: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Firebase Authentication Error:", error);
      if (error.code !== "auth/popup-closed-by-user") {
        alert("Failed to sign in with Google.");
      }
    }
  });
});

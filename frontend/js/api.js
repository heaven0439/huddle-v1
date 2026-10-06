// frontend/js/api.js

// We will run our FastAPI backend on port 8000 later.
const API_BASE_URL = "http://localhost:8000/api";

/**
 * Retrieves the JWT authentication token from local storage.
 * Note: LocalStorage is suitable for storing temporary session tokens,
 * but our actual user data will safely reside in the backend database.
 */
export function getAuthToken() {
  return localStorage.getItem("huddle_token");
}

export function setAuthToken(token) {
  localStorage.setItem("huddle_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("huddle_token");
}

/**
 * A master function to handle all HTTP requests to our backend.
 * It automatically attaches the authorization token and handles JSON parsing.
 */
export async function apiRequest(endpoint, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Throw an error with the backend's message, or a generic one
      throw new Error(
        data.detail || data.message || "An error occurred. Please try again.",
      );
    }

    return data;
  } catch (error) {
    // Log the error for debugging, then re-throw it so the UI can display it
    console.error(`API Error [${method} ${endpoint}]:`, error.message);
    throw error;
  }
}

# Huddle - Real-Time Video Conferencing

Huddle is a secure, real-time video conferencing application engineered for ultra-low latency peer-to-peer communication. The architecture leverages a highly performant Python FastAPI backend and a lightweight, framework-free Vanilla JavaScript frontend to deliver seamless media streaming.

## System Architecture & Features

* **Real-Time Media Streaming:** Utilizes native WebRTC for direct, peer-to-peer video and audio transmission, minimizing server load and latency.
* **WebSocket Signaling:** Employs persistent, asynchronous WebSocket connections to handle instant connection handshakes and network routing.
* **Secure Authentication:** Integrates Google Sign-In via Firebase Auth, ensuring isolated, secure user verification before granting network access.
* **Zero-Dependency Client:** The frontend is built entirely with standard HTML5, CSS3, and ES6 JavaScript, resulting in lightning-fast load times and execution.
* **Asynchronous Backend:** Powered by Python and FastAPI, utilizing Uvicorn for high-throughput, non-blocking network requests.

## Technology Stack

* **Client-Side:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Server-Side:** Python, FastAPI, WebSockets, Uvicorn
* **Data & Storage:** SQLite
* **Identity & Network:** Firebase Authentication, Google STUN Servers

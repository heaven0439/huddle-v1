# backend/signaling.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Maps a room_code to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        """Accepts a new WebSocket connection and adds it to the correct room."""
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
        self.active_connections[room_code].append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        """Removes a WebSocket connection when a user leaves."""
        if room_code in self.active_connections:
            if websocket in self.active_connections[room_code]:
                self.active_connections[room_code].remove(websocket)
            # Clean up the room if it's empty
            if not self.active_connections[room_code]:
                del self.active_connections[room_code]

    async def broadcast_to_room(self, message: dict, room_code: str, sender: WebSocket = None):
        """Sends a JSON message to everyone in the room EXCEPT the sender."""
        if room_code in self.active_connections:
            for connection in self.active_connections[room_code]:
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        print(f"Error sending message: {e}")

# Create a single global instance of the manager
manager = ConnectionManager()
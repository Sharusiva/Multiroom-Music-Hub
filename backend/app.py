
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, join_room, emit
from flask_cors import CORS
from uuid import uuid4

# Initializing Flask Server. This server supports creating a listening room via REST API and controlling playback via WebSocket events. The server is designed to be used in conjunction with a frontend application that connects to it, Joining a room and sending playback commands. The server maintains the state of each room in memory, allowing for real-time updates to all connected clients.

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173"],
    async_mode="threading"
)

# Temporary in-memory storage for Phase 1
rooms = {}


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "running"})


@app.route("/api/rooms", methods=["POST"])
def create_room():
    data = request.get_json(silent=True) or {}

    room_id = str(uuid4())[:8]

    rooms[room_id] = {
        "name": data.get("name") or "Music Room",
        "status": "paused",
        "song": None,
        "position": 0
    }

    return jsonify({
        "roomId": room_id,
        "room": rooms[room_id]
    }), 201


@socketio.on("join_room")
def handle_join(data):
    room_id = data.get("roomId")

    if room_id not in rooms:
        return {"error": "Room not found"}

    join_room(room_id)

    emit("room_state", rooms[room_id])

    return {"success": True}


@socketio.on("playback_command")
def handle_playback(data):
    room_id = data.get("roomId")
    action = data.get("action")

    if room_id not in rooms:
        return {"error": "Room not found"}

    if action not in ("play", "pause"):
        return {"error": "Invalid action"}

    rooms[room_id]["status"] = (
        "playing" if action == "play" else "paused"
    )

    socketio.emit(
        "room_state",
        rooms[room_id],
        to=room_id
    )

    return {"success": True}


if __name__ == "__main__":
    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=True
    )

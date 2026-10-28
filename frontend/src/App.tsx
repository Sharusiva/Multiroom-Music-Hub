
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:5000", {
  transports: ["websocket"],
  autoConnect: false
});

type RoomState = {
  name: string;
  status: "playing" | "paused";
  song: string | null;
  position: number;
};

function App() {
  const [roomName, setRoomName] = useState("Music Room");
  const [roomId, setRoomId] = useState("");
  const [joinId, setJoinId] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.connect();

    const onRoomState = (state: RoomState) => {
      setRoom(state);
    };

    socket.on("room_state", onRoomState);

    return () => {
      socket.off("room_state", onRoomState);
      socket.disconnect();
    };
  }, []);

  function joinRoom(id: string) {
    socket.emit(
      "join_room",
      { roomId: id },
      (response: { success?: boolean; error?: string }) => {
        if (response?.success) {
          setRoomId(id);
          setMessage(`Joined room ${id}`);
        } else {
          setMessage(response?.error || "Unable to join room");
        }
      }
    );
  }

  async function createRoom() {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/rooms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: roomName })
        }
      );

      if (!response.ok) {
        throw new Error("Room creation failed");
      }

      const data = await response.json();
      joinRoom(data.roomId);
    } catch {
      setMessage("Could not create room");
    }
  }

  function sendPlayback(action: "play" | "pause") {
    socket.emit(
      "playback_command",
      { roomId, action }
    );
  }

  return (
    <main style={{
      maxWidth: "600px",
      margin: "60px auto",
      fontFamily: "Arial",
      padding: "20px"
    }}>
      <h1>Multiroom Music Hub</h1>
      <p>Distributed Music Listening Application</p>

      <h2>Create Room</h2>
      <input
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <button onClick={createRoom}>
        Create Room
      </button>

      <h2>Join Room</h2>
      <input
        placeholder="Room ID"
        value={joinId}
        onChange={(e) => setJoinId(e.target.value)}
      />
      <button onClick={() => joinRoom(joinId)}>
        Join Room
      </button>

      {room && (
        <section>
          <h2>{room.name}</h2>
          <p>Room ID: {roomId}</p>
          <p>Status: {room.status}</p>

          <button onClick={() => sendPlayback("play")}>
            Play
          </button>

          <button onClick={() => sendPlayback("pause")}>
            Pause
          </button>
        </section>
      )}

      <p>{message}</p>
    </main>
  );
}

export default App;

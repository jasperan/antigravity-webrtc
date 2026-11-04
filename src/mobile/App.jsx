import React, { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import RemoteVideoDisplay from './components/RemoteVideoDisplay';
import KeyboardInput from './components/KeyboardInput';

// hardcoded for dev, proxy handles specific path if used
const SERVER_URL = 'http://localhost:3000';

function App() {
    const [sessionId, setSessionId] = useState('');
    const [joined, setJoined] = useState(false);

    const { status, remoteStream, sendKeystroke } = useWebRTC(joined ? SERVER_URL : null, joined ? sessionId : null);

    const handleJoin = (e) => {
        e.preventDefault();
        if (sessionId.trim()) setJoined(true);
    };

    if (!joined) {
        return (
            <div className="app-container">
                <div className="connect">
                    <h2>Connect to desktop</h2>
                    <p>Pair with the session id shown in the desktop panel.</p>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            className="session-input"
                            placeholder="session id"
                            aria-label="Session id"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <button type="submit" className="btn primary block">Connect</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="statusbar">
                <span className={`lamp ${status}`} aria-hidden="true" />
                <span className="status-session">{sessionId}</span>
                <span className="status-text" role="status">{status}</span>
            </div>

            <div className="capture">
                <RemoteVideoDisplay stream={remoteStream} />
            </div>

            <KeyboardInput onKeystroke={sendKeystroke} />
        </div>
    );
}

export default App;

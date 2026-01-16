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

    return (
        <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {!joined ? (
                <div style={{ padding: 20 }}>
                    <h2>Connect to Desktop</h2>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            placeholder="Session ID"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            style={{ padding: 10, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
                        />
                        <button type="submit" style={{ padding: 10, width: '100%' }}>Connect</button>
                    </form>
                </div>
            ) : (
                <>
                    <div style={{ padding: 10, background: '#333' }}>
                        <span>Status: </span>
                        <span style={{ color: status === 'connected' ? '#4caf50' : '#f44336' }}>
                            {status}
                        </span>
                    </div>

                    <div style={{ flex: '0 0 auto', maxHeight: '60%' }}>
                        <RemoteVideoDisplay stream={remoteStream} />
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <KeyboardInput onKeystroke={sendKeystroke} />
                    </div>
                </>
            )}
        </div>
    );
}

export default App;

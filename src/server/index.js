const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const sessionManager = require('./sessionManager');
const setupSignaling = require('./signaling');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for now, or match config.corsOrigin
        methods: ["GET", "POST"]
    }
});

setupSignaling(io);

// API Endpoints
app.post('/api/sessions/create', (req, res) => {
    const session = sessionManager.createSession();
    console.log(`Created session ${session.sessionId}`);
    res.json({ sessionId: session.sessionId });
});

app.get('/api/sessions/:sessionId/status', (req, res) => {
    const session = sessionManager.getSession(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({
        sessionId: session.sessionId,
        desktopConnected: session.desktop.connected,
        mobileConnected: session.mobile.connected
    });
});

// Periodic cleanup
setInterval(() => {
    sessionManager.cleanupExpiredSessions(config.sessionTimeout);
}, 60 * 1000);

// Start server
if (require.main === module) {
    server.listen(config.port, () => {
        console.log(`Signaling server running on port ${config.port}`);
    });
}

module.exports = { app, server, io }; // For testing

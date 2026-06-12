const sessionManager = require('./sessionManager');

// The peer role for a given role: desktop <-> mobile.
const PEER = { desktop: 'mobile', mobile: 'desktop' };

// Helper to update activity
const touchSession = (sessionId) => {
    const session = sessionManager.getSession(sessionId);
    if (session) {
        session.lastActivity = Date.now();
    }
};

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('register', ({ sessionId, role }) => {
            console.log(`Register request: ${role} for session ${sessionId}`);
            const session = sessionManager.registerClient(sessionId, role, socket.id);

            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }

            socket.join(sessionId);
            socket.emit('registered', { sessionId, role });

            // Notify other peer if connected
            const otherRole = PEER[role];
            if (session[otherRole].connected) {
                io.to(session[otherRole].socketId).emit('client-connected', { role });
                socket.emit('client-connected', { role: otherRole });
            }

            // Deliver queued candidates meant FOR this role
            const queuedCandidates = sessionManager.getQueuedCandidates(sessionId, role);
            queuedCandidates.forEach(candidate => {
                socket.emit('ice-candidate', { candidate });
            });
        });

        // Relay an SDP message to the target peer if it is connected.
        const relaySdp = (sessionId, sdp, targetRole, event) => {
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (session && session[targetRole].connected) {
                console.log(`Forwarding ${event} to ${targetRole} in session ${sessionId}`);
                io.to(session[targetRole].socketId).emit(`${event}-received`, { sdp });
            } else {
                console.warn(`${targetRole} not connected for ${event} in session ${sessionId}`);
            }
        };

        socket.on('offer', ({ sessionId, sdp }) => relaySdp(sessionId, sdp, 'mobile', 'offer'));

        socket.on('answer', ({ sessionId, sdp }) => relaySdp(sessionId, sdp, 'desktop', 'answer'));

        socket.on('ice-candidate', ({ sessionId, candidate, role }) => {
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (!session) return;

            // candidate comes FROM 'role'. We need to send it TO 'targetRole'
            const targetRole = PEER[role];

            if (session[targetRole].connected) {
                console.log(`Forwarding ICE candidate to ${targetRole}`);
                io.to(session[targetRole].socketId).emit('ice-candidate', { candidate });
            } else {
                console.log(`Queuing ICE candidate for ${targetRole}`);
                sessionManager.addIceCandidate(sessionId, targetRole, candidate);
            }
        });

        socket.on('ping', () => {
            socket.emit('pong');
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            const result = sessionManager.removeClient(socket.id);
            if (result) {
                const { sessionId, role } = result;
                const session = sessionManager.getSession(sessionId);
                if (session) {
                    const otherRole = PEER[role];
                    if (session[otherRole].connected) {
                        io.to(session[otherRole].socketId).emit('client-disconnected', { role });
                    }
                }
            }
        });
    });
};

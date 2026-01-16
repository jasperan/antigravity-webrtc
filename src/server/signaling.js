const sessionManager = require('./sessionManager');

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
            const otherRole = role === 'desktop' ? 'mobile' : 'desktop';
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

        socket.on('offer', ({ sessionId, sdp }) => {
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (session && session.mobile.connected) {
                console.log(`Forwarding offer to mobile in session ${sessionId}`);
                io.to(session.mobile.socketId).emit('offer-received', { sdp });
            } else {
                console.warn(`Mobile not connected for offer in session ${sessionId}`);
            }
        });

        socket.on('answer', ({ sessionId, sdp }) => {
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (session && session.desktop.connected) {
                console.log(`Forwarding answer to desktop in session ${sessionId}`);
                io.to(session.desktop.socketId).emit('answer-received', { sdp });
            } else {
                console.warn(`Desktop not connected for answer in session ${sessionId}`);
            }
        });

        socket.on('ice-candidate', ({ sessionId, candidate, role }) => {
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (!session) return;

            // candidate comes FROM 'role'. We need to send it TO 'targetRole'
            const targetRole = role === 'desktop' ? 'mobile' : 'desktop';

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
                    const otherRole = role === 'desktop' ? 'mobile' : 'desktop';
                    if (session[otherRole].connected) {
                        io.to(session[otherRole].socketId).emit('client-disconnected', { role });
                    }
                }
            }
        });
    });
};

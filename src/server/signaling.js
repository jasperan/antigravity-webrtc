const sessionManager = require('./sessionManager');

// The peer role for a given role: desktop <-> mobile.
const PEER = { desktop: 'mobile', mobile: 'desktop' };

const isObject = (v) => v !== null && typeof v === 'object';
const isRole = (r) => r === 'desktop' || r === 'mobile';

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

        socket.on('register', (payload) => {
            if (!isObject(payload) || typeof payload.sessionId !== 'string' || !isRole(payload.role)) {
                socket.emit('error', 'Invalid register payload');
                return;
            }
            const { sessionId, role } = payload;
            console.log(`Register request: ${role} for session ${sessionId}`);
            const session = sessionManager.registerClient(sessionId, role, socket.id);

            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }

            socket.data.sessionId = sessionId;
            socket.data.role = role;
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
        // Only a socket registered as `senderRole` in `sessionId` may relay.
        const relaySdp = (socket, payload, senderRole, targetRole, event) => {
            if (!isObject(payload) || typeof payload.sessionId !== 'string') return;
            const { sessionId, sdp } = payload;
            if (socket.data.sessionId !== sessionId || socket.data.role !== senderRole) {
                socket.emit('error', `Not registered as ${senderRole} for this session`);
                return;
            }
            touchSession(sessionId);
            const session = sessionManager.getSession(sessionId);
            if (session && session[targetRole].connected) {
                console.log(`Forwarding ${event} to ${targetRole} in session ${sessionId}`);
                io.to(session[targetRole].socketId).emit(`${event}-received`, { sdp });
            } else {
                console.warn(`${targetRole} not connected for ${event} in session ${sessionId}`);
            }
        };

        socket.on('offer', (payload) => relaySdp(socket, payload, 'desktop', 'mobile', 'offer'));

        socket.on('answer', (payload) => relaySdp(socket, payload, 'mobile', 'desktop', 'answer'));

        socket.on('ice-candidate', (payload) => {
            if (!isObject(payload) || typeof payload.sessionId !== 'string') return;
            const { sessionId, candidate } = payload;
            // The sender's role is the one bound at registration, not client-supplied.
            const role = socket.data.role;
            if (socket.data.sessionId !== sessionId || !isRole(role)) {
                socket.emit('error', 'Not registered for this session');
                return;
            }
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

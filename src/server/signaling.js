const sessionManager = require('./sessionManager');

// The peer role for a given role: desktop <-> mobile.
const PEER = { desktop: 'mobile', mobile: 'desktop' };

const isObject = (v) => v !== null && typeof v === 'object';
const isRole = (r) => r === 'desktop' || r === 'mobile';

const MAX_SDP_BYTES = 64 * 1024;
const MAX_CANDIDATE_BYTES = 8 * 1024;

// SDP is either a raw string or a serialized {type, sdp} description.
const isValidSdp = (sdp) => {
    if (typeof sdp === 'string') return sdp.length <= MAX_SDP_BYTES;
    if (!isObject(sdp) || Array.isArray(sdp)) return false;
    try {
        return JSON.stringify(sdp).length <= MAX_SDP_BYTES;
    } catch {
        return false;
    }
};

const isValidCandidate = (c) => {
    if (!isObject(c) || Array.isArray(c)) return false;
    try {
        return JSON.stringify(c).length <= MAX_CANDIDATE_BYTES;
    } catch {
        return false;
    }
};

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

        // Tell the remaining peer that `role` left `sessionId`.
        const notifyLeft = ({ sessionId, role }) => {
            const session = sessionManager.getSession(sessionId);
            if (!session) return;
            const other = session[PEER[role]];
            if (other.connected) {
                io.to(other.socketId).emit('client-disconnected', { role });
            }
        };

        socket.on('register', (payload) => {
            if (!isObject(payload) || typeof payload.sessionId !== 'string' || !isRole(payload.role)) {
                socket.emit('error', 'Invalid register payload');
                return;
            }
            const { sessionId, role } = payload;
            if (!sessionManager.getSession(sessionId)) {
                socket.emit('error', 'Session not found');
                return;
            }
            // A socket holds one binding: release any previous session/role.
            sessionManager.removeClient(socket.id, { sessionId, role }).forEach((prev) => {
                socket.leave(prev.sessionId);
                notifyLeft(prev);
            });
            console.log(`Register request: ${role} for session ${sessionId}`);
            const session = sessionManager.registerClient(sessionId, role, socket.id);

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
            if (!sessionManager.isRegistered(sessionId, senderRole, socket.id)) {
                socket.emit('error', `Not registered as ${senderRole} for this session`);
                return;
            }
            if (!isValidSdp(sdp)) {
                socket.emit('error', 'Invalid sdp');
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
            if (!isRole(role) || !sessionManager.isRegistered(sessionId, role, socket.id)) {
                socket.emit('error', 'Not registered for this session');
                return;
            }
            if (!isValidCandidate(candidate)) {
                socket.emit('error', 'Invalid candidate');
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
            sessionManager.removeClient(socket.id).forEach(notifyLeft);
        });
    });
};

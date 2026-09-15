const { v4: uuidv4 } = require('uuid');

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    createSession() {
        const sessionId = uuidv4();
        const session = {
            sessionId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            desktop: {
                socketId: null,
                connected: false,
            },
            mobile: {
                socketId: null,
                connected: false,
            },
            iceCandidatesQueue: {
                desktop: [], // Candidates meant FOR desktop (from mobile)
                mobile: []   // Candidates meant FOR mobile (from desktop)
            }
        };
        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    registerClient(sessionId, role, socketId) {
        const session = this.getSession(sessionId);
        if (!session) return null;

        if (session[role]) {
            session[role].socketId = socketId;
            session[role].connected = true;
        }

        session.lastActivity = Date.now();
        return session;
    }

    removeClient(socketId) {
        for (const [sessionId, session] of this.sessions.entries()) {
            for (const role of ['desktop', 'mobile']) {
                if (session[role].socketId === socketId) {
                    session[role].connected = false;
                    session[role].socketId = null;
                    return { sessionId, role };
                }
            }
        }
        return null;
    }

    // Add candidate DESTINED for a specific role
    addIceCandidate(sessionId, targetRole, candidate) {
        const session = this.getSession(sessionId);
        if (!session) return false;

        session.iceCandidatesQueue[targetRole].push(candidate);
        return true;
    }

    getQueuedCandidates(sessionId, targetRole) {
        const session = this.getSession(sessionId);
        if (!session) return [];

        // Return queued candidates and clear the queue in one step
        return session.iceCandidatesQueue[targetRole].splice(0);
    }

    cleanupExpiredSessions(timeoutMs) {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > timeoutMs) {
                this.sessions.delete(sessionId);
                console.log(`Session ${sessionId} cleaned up due to timeout`);
            }
        }
    }
}

module.exports = new SessionManager();

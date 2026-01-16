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

        if (role === 'desktop') {
            session.desktop.socketId = socketId;
            session.desktop.connected = true;
        } else if (role === 'mobile') {
            session.mobile.socketId = socketId;
            session.mobile.connected = true;
        }

        session.lastActivity = Date.now();
        return session;
    }

    removeClient(socketId) {
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.desktop.socketId === socketId) {
                session.desktop.connected = false;
                session.desktop.socketId = null;
                return { sessionId, role: 'desktop' };
            }
            if (session.mobile.socketId === socketId) {
                session.mobile.connected = false;
                session.mobile.socketId = null;
                return { sessionId, role: 'mobile' };
            }
        }
        return null;
    }

    // Add candidate DESTINED for a specific role
    addIceCandidate(sessionId, targetRole, candidate) {
        const session = this.getSession(sessionId);
        if (!session) return false;

        if (targetRole === 'desktop') {
            session.iceCandidatesQueue.desktop.push(candidate);
        } else {
            session.iceCandidatesQueue.mobile.push(candidate);
        }
        return true;
    }

    getQueuedCandidates(sessionId, targetRole) {
        const session = this.getSession(sessionId);
        if (!session) return [];

        const queue = targetRole === 'desktop' ? session.iceCandidatesQueue.desktop : session.iceCandidatesQueue.mobile;
        const candidates = [...queue];
        // Clear queue after retrieval
        if (targetRole === 'desktop') {
            session.iceCandidatesQueue.desktop = [];
        } else {
            session.iceCandidatesQueue.mobile = [];
        }
        return candidates;
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

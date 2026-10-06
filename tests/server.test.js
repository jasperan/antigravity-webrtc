const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { app, server, io } = require('../src/server/index');
const config = require('../src/server/config');

describe('Server Integration Tests', () => {
    let clientSocketDesktop;
    let clientSocketMobile;
    let sessionId;

    beforeAll((done) => {
        // Server is already listening in index.js if run directly, but for tests we might want to ensure it's up?
        // Actually index.js starts listening if require.main === module.
        // So here we need to start it if not started or just use the exported server.
        // But since index.js exports app and server and doesn't start if imported, we should start it here?
        // Wait, the index.js logic says: if (require.main === module) server.listen...
        // So when I require it, it WON'T listen. I need to listen manually.
        if (!server.listening) {
            server.listen(config.port, () => {
                done();
            });
        } else {
            done();
        }
    });

    afterAll((done) => {
        io.close();
        server.close();
        done();
    });

    afterEach(() => {
        if (clientSocketDesktop && clientSocketDesktop.connected) clientSocketDesktop.disconnect();
        if (clientSocketMobile && clientSocketMobile.connected) clientSocketMobile.disconnect();
    });

    test('POST /api/sessions/create should return a sessionId', async () => {
        const res = await request(app).post('/api/sessions/create');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('sessionId');
        sessionId = res.body.sessionId;
    });

    test('GET /api/sessions/:sessionId/status should return session status', async () => {
        if (!sessionId) {
            // Create one if previous test failed or ran out of order
            const res = await request(app).post('/api/sessions/create');
            sessionId = res.body.sessionId;
        }
        const res = await request(app).get(`/api/sessions/${sessionId}/status`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({
            sessionId: sessionId,
            desktopConnected: false,
            mobileConnected: false
        });
    });

    test('Socket registration and signaling', (done) => {
        if (!sessionId) {
            // Should have been created
            throw new Error("No session ID");
        }

        clientSocketDesktop = new Client(`http://localhost:${config.port}`);
        clientSocketMobile = new Client(`http://localhost:${config.port}`);

        clientSocketDesktop.on('connect', () => {
            clientSocketDesktop.emit('register', { sessionId, role: 'desktop' });
        });

        clientSocketMobile.on('connect', () => {
            // Wait a bit to ensure desktop registers first for this test flow, 
            // essentially testing the "client-connected" notification
            setTimeout(() => {
                clientSocketMobile.emit('register', { sessionId, role: 'mobile' });
            }, 50);
        });

        let desktopRegistered = false;
        let mobileConnectedNotified = false;

        clientSocketDesktop.on('registered', (data) => {
            expect(data.sessionId).toBe(sessionId);
            expect(data.role).toBe('desktop');
            desktopRegistered = true;
        });

        clientSocketDesktop.on('client-connected', (data) => {
            expect(data.role).toBe('mobile');
            mobileConnectedNotified = true;

            // Once mobile connects, test signaling
            clientSocketDesktop.emit('offer', { sessionId, sdp: 'mock-sdp-offer' });
        });

        clientSocketMobile.on('offer-received', (data) => {
            expect(data.sdp).toBe('mock-sdp-offer');
            clientSocketMobile.emit('answer', { sessionId, sdp: 'mock-sdp-answer' });
        });

        clientSocketDesktop.on('answer-received', (data) => {
            expect(data.sdp).toBe('mock-sdp-answer');
            if (desktopRegistered && mobileConnectedNotified) {
                done();
            }
        });

    }, 10000); // Increase timeout

    describe('hardening', () => {
        const sessionManager = require('../src/server/sessionManager');
        const connect = () => new Promise((resolve) => {
            const c = new Client(`http://localhost:${config.port}`);
            c.on('connect', () => resolve(c));
        });
        const nextEvent = (c, ev, ms = 500) => new Promise((resolve) => {
            const t = setTimeout(() => resolve(undefined), ms);
            c.once(ev, (d) => { clearTimeout(t); resolve(d); });
        });

        test('malformed payloads and bad roles do not crash the server', async () => {
            const res = await request(app).post('/api/sessions/create');
            const id = res.body.sessionId;
            const c = await connect();
            c.emit('register', null);
            expect(await nextEvent(c, 'error')).toBeDefined();
            c.emit('register', { sessionId: id, role: 'admin' });
            expect(await nextEvent(c, 'error')).toBeDefined();
            c.emit('ice-candidate', { sessionId: id, candidate: {}, role: 'bogus' });
            c.emit('offer', undefined);
            // server must still be alive and serving
            const status = await request(app).get(`/api/sessions/${id}/status`);
            expect(status.statusCode).toBe(200);
            expect(status.body.desktopConnected).toBe(false);
            c.disconnect();
        });

        test('unregistered socket cannot inject offers into a session', async () => {
            const { body: { sessionId: id } } = await request(app).post('/api/sessions/create');
            const mobile = await connect();
            mobile.emit('register', { sessionId: id, role: 'mobile' });
            await nextEvent(mobile, 'registered');
            const attacker = await connect();
            attacker.emit('offer', { sessionId: id, sdp: 'evil' });
            expect(await nextEvent(attacker, 'error')).toBeDefined();
            expect(await nextEvent(mobile, 'offer-received', 200)).toBeUndefined();
            mobile.disconnect();
            attacker.disconnect();
        });

        test('sessions with a connected client are not expired; idle ones are', () => {
            const live = sessionManager.createSession();
            const idle = sessionManager.createSession();
            sessionManager.registerClient(live.sessionId, 'desktop', 'sock-live');
            live.lastActivity = idle.lastActivity = Date.now() - 10 * 60 * 1000;
            sessionManager.cleanupExpiredSessions(5 * 60 * 1000);
            expect(sessionManager.getSession(live.sessionId)).toBeDefined();
            expect(sessionManager.getSession(idle.sessionId)).toBeUndefined();
            sessionManager.removeClient('sock-live');
            sessionManager.sessions.delete(live.sessionId);
        });

        test('ICE candidate queue is bounded', () => {
            const s = sessionManager.createSession();
            let accepted = 0;
            for (let i = 0; i < 1000; i++) if (sessionManager.addIceCandidate(s.sessionId, 'mobile', { i })) accepted++;
            expect(accepted).toBeLessThan(1000);
            sessionManager.sessions.delete(s.sessionId);
        });
    });
});

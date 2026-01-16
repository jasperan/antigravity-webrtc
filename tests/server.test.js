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
});

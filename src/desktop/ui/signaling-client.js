import { io } from './socket.io.js';

export class SignalingClient {
    constructor(serverUrl, onStateChange) {
        this.socket = null;
        this.serverUrl = serverUrl;
        this.sessionId = null;
        this.role = 'desktop';
        this.onStateChange = onStateChange || (() => { });

        // Event callbacks
        this.onOffer = null;
        this.onAnswer = null;
        this.onIceCandidate = null;
        this.onClientConnected = null;
        this.onClientDisconnected = null;
    }

    connect(sessionId) {
        this.sessionId = sessionId;
        this.onStateChange('connecting');

        this.socket = io(this.serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('register', { sessionId: this.sessionId, role: this.role });
        });

        this.socket.on('registered', ({ sessionId }) => {
            console.log(`Registered Desktop for session ${sessionId}`);
            this.onStateChange('connected');
        });

        this.socket.on('offer-received', (data) => {
            if (this.onOffer) this.onOffer(data);
        });

        this.socket.on('answer-received', (data) => {
            if (this.onAnswer) this.onAnswer(data);
        });

        this.socket.on('ice-candidate', (data) => {
            if (this.onIceCandidate) this.onIceCandidate(data);
        });

        this.socket.on('client-connected', (data) => {
            console.log('Peer connected:', data.role);
            if (this.onClientConnected) this.onClientConnected(data.role);
        });

        this.socket.on('client-disconnected', (data) => {
            console.log('Peer disconnected:', data.role);
            if (this.onClientDisconnected) this.onClientDisconnected(data.role);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
            this.onStateChange('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.onStateChange('error');
        });
    }

    sendOffer(sdp) {
        this.socket.emit('offer', { sessionId: this.sessionId, sdp });
    }

    sendIceCandidate(candidate) {
        this.socket.emit('ice-candidate', { sessionId: this.sessionId, candidate, role: this.role });
    }
}

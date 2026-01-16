import { SignalingClient } from './signaling-client.js';
import { ScreenCapturer } from './screen-capture.js';
import { WebRTCPeer } from './webrtc-peer.js';
// config specific to client side? We can hardcode or fetch from an endpoint.
// For simplicity, hardcoded defaults matching .env
const CONFIG = {
    serverUrl: 'http://localhost:3000',
};

const state = {
    sessionId: null,
    isCapturing: false,
    isConnected: false
};

// UI Elements
const statusEl = document.getElementById('connection-status');
const sessionIdEl = document.getElementById('session-id');
const fpsEl = document.getElementById('fps-counter');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const canvas = document.getElementById('preview-canvas');
const inputs = {
    x: document.getElementById('inp-x'),
    y: document.getElementById('inp-y'),
    w: document.getElementById('inp-w'),
    h: document.getElementById('inp-h')
};

// Modules
const capturer = new ScreenCapturer(canvas);
let signaling;
let webrtc;

async function init() {
    try {
        // 1. Create Session
        const response = await fetch(`${CONFIG.serverUrl}/api/sessions/create`, { method: 'POST' });
        const data = await response.json();
        state.sessionId = data.sessionId;
        sessionIdEl.textContent = state.sessionId.substring(0, 8) + '...';

        // 2. Initialize Signaling
        signaling = new SignalingClient(CONFIG.serverUrl, (status) => {
            statusEl.textContent = status;
            statusEl.className = `status-value ${status}`;
            if (status === 'connected') state.isConnected = true;
            else if (status === 'disconnected') state.isConnected = false;
        });

        signaling.connect(state.sessionId);

        // 3. Initialize WebRTC peer (will be started when client connects)
        // But WebRTCPeer needs a stream. So we need to capture first or provide stream later.
        // Our WebRTCPeer constructor takes stream.
        // Ideally we start capturing when the app starts or when user clicks Start.

    } catch (e) {
        console.error('Failed to init:', e);
        statusEl.textContent = 'Init Failed';
    }
}

btnStart.addEventListener('click', async () => {
    const sources = await window.electronAPI.getDesktopSources();
    // Simple Source Selection: just take the first screen
    // In a real app we'd show a picker.
    // Assuming the first source is the screen.
    const source = sources[0];
    if (source) {
        const success = await capturer.startCapture(source.id);
        if (success) {
            state.isCapturing = true;
            updateUI();

            // Update crop region
            updateCrop();

            // Setup WebRTC with this stream
            webrtc = new WebRTCPeer(signaling, capturer.getStream());
        }
    }
});

btnStop.addEventListener('click', () => {
    capturer.stopCapture();
    state.isCapturing = false;
    updateUI();
});

function updateCrop() {
    const region = {
        x: parseInt(inputs.x.value),
        y: parseInt(inputs.y.value),
        width: parseInt(inputs.w.value),
        height: parseInt(inputs.h.value)
    };
    capturer.setCropRegion(region);
}

// Update inputs listeners
Object.values(inputs).forEach(inp => inp.addEventListener('change', updateCrop));

function updateUI() {
    btnStart.disabled = state.isCapturing;
    btnStop.disabled = !state.isCapturing;
}

// Start Init
init();

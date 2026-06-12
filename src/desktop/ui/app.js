import { SignalingClient } from './signaling-client.js';
import { ScreenCapturer } from './screen-capture.js';
import { WebRTCPeer } from './webrtc-peer.js';
// config specific to client side? We can hardcode or fetch from an endpoint.
// For simplicity, hardcoded defaults matching .env
const CONFIG = {
    serverUrl: 'http://localhost:3000',
};

const state = {
    sessionId: null
};

// UI Elements
const statusEl = document.getElementById('connection-status');
const sessionIdEl = document.getElementById('session-id');
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
    updateUI();
});

// Parse an input value to a non-negative integer, defaulting to `fallback`
// when the field is empty or not a number (so an empty box never blanks the canvas).
function intValue(input, fallback) {
    const n = parseInt(input.value, 10);
    return Number.isNaN(n) ? fallback : Math.max(0, n);
}

function updateCrop() {
    const region = {
        x: intValue(inputs.x, 0),
        y: intValue(inputs.y, 0),
        width: intValue(inputs.w, 400),
        height: intValue(inputs.h, 50)
    };
    capturer.setCropRegion(region);
}

// Update inputs listeners
Object.values(inputs).forEach(inp => inp.addEventListener('change', updateCrop));

function updateUI() {
    btnStart.disabled = capturer.isCapturing;
    btnStop.disabled = !capturer.isCapturing;
}

// Start Init
init();

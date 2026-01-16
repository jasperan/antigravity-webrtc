# Antigravity Remote Screen Capture & Control System
## Complete Implementation Plan for Gemini AI

**Project Goal:** Build a system to capture a small portion of the Antigravity IDE input box on a desktop and control it remotely from a phone via WebRTC streaming and keyboard input.

**Technology Stack:**
- Desktop: Node.js + Electron + canvas-to-webrtc
- Server: Express.js + Socket.io (signaling)
- Mobile: React web app
- Protocol: WebRTC + Data Channels
- Compression: H.264/VP8 video codec

---

## Part 1: Desktop Capture & Cropping Module

### 1.1 Create Electron Desktop App (Node.js)

**File:** `src/desktop/main.js`

**Requirements:**
1. Use Electron to run a desktop application
2. Implement `getDisplayMedia()` API to capture full desktop screen
3. Allow user to visually select/define the region of Antigravity input box (draggable rectangle)
4. Store the selected region coordinates: `{x: number, y: number, width: number, height: number}`
5. Use Canvas API to continuously crop the captured screen to only the input box region
6. Maintain 30 FPS capture rate for smooth streaming
7. Handle screen resize and monitor changes gracefully
8. Provide a small overlay UI showing:
   - "Recording" indicator
   - Region coordinates being captured
   - Current FPS
   - Connection status (not connected, connecting, connected)
   - Start/Stop button
   - Region selection mode toggle button

**Key Functions Needed:**
- `initDisplayCapture()` - Request screen sharing permission
- `selectCaptureRegion()` - Allow user to drag/click to define region
- `cropCanvasFrame(canvas, x, y, width, height)` - Crop frame to region
- `startCapturing()` - Begin continuous screen capture at 30 FPS
- `stopCapturing()` - Stop screen capture
- `getCanvasStream()` - Return the cropped canvas as a media stream

**Canvas Cropping Logic:**
```
Video from getDisplayMedia (full screen)
    ↓
Canvas element (full resolution)
drawImage(video, 0, 0, videoWidth, videoHeight)
    ↓
Cropped Canvas (only input box region)
drawImage(video, inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, 0, 0, inputBoxWidth, inputBoxHeight)
    ↓
requestAnimationFrame loop at 30 FPS
    ↓
captureStream() to get media stream
```

### 1.2 WebRTC Peer Connection (Desktop)

**File:** `src/desktop/webrtc-peer.js`

**Requirements:**
1. Create RTCPeerConnection to establish connection with phone
2. Add the cropped canvas stream as video track
3. Create data channel named "keyboard-input" for receiving keystrokes from phone
4. Handle ICE candidates and offer/answer signaling via WebSocket
5. Implement error handling and connection state monitoring
6. Log connection status: connecting → connected → disconnected
7. Gracefully handle reconnection attempts (max 5 retries with exponential backoff)
8. Compress video using H.264 or VP8 codec
9. Set video bitrate limit to 500 kbps for mobile efficiency
10. Configure ideal frame rate: 30 fps

**Key Functions Needed:**
- `createPeerConnection(signalingServer)` - Initialize RTCPeerConnection
- `addVideoTrack(canvasStream)` - Add cropped canvas stream
- `createDataChannel()` - Create keyboard input data channel
- `handleKeyboardInput(keystroke)` - Receive and process keystrokes from phone
- `simulateKeyboardPress(key, modifiers)` - Send keystroke to Antigravity window
- `handleIceCandidate(candidate)` - Process ICE candidates
- `sendOffer()` - Send SDP offer to signaling server
- `receiveAnswer(answer)` - Receive SDP answer from phone

**Keystroke Simulation:**
- Use `pyautogui` (Python) or `robotjs` (Node.js) to simulate keyboard input
- Map received characters to actual keyboard events on the Antigravity window
- Support special keys: Enter, Backspace, Delete, Arrow keys, Tab, Escape
- Support modifier keys: Shift, Ctrl, Alt, Cmd

### 1.3 WebSocket Signaling Connection

**File:** `src/desktop/signaling-client.js`

**Requirements:**
1. Connect to signaling server via WebSocket
2. Send/receive SDP offers and answers
3. Send/receive ICE candidates
4. Implement connection heartbeat (ping/pong every 30 seconds)
5. Auto-reconnect on disconnect with exponential backoff
6. Emit events: connected, disconnected, offer-received, answer-received, candidate-received
7. Handle connection timeout (30 seconds)

**Messages to Implement:**
```
Desktop → Server:
- {"type": "register", "role": "desktop", "sessionId": "unique-id"}
- {"type": "offer", "sessionId": "...", "sdp": "..."}
- {"type": "ice-candidate", "sessionId": "...", "candidate": {...}}

Desktop ← Server:
- {"type": "answer-received", "sessionId": "...", "sdp": "..."}
- {"type": "ice-candidate", "sessionId": "...", "candidate": {...}}
- {"type": "client-connected", "sessionId": "..."}
- {"type": "client-disconnected", "sessionId": "..."}
```

---

## Part 2: Mobile Receiver App (React Web App)

### 2.1 React Web App Setup

**File:** `src/mobile/App.jsx`

**Requirements:**
1. Create a responsive React web application (mobile-first)
2. Use React hooks: useState, useEffect, useRef
3. Implement responsive grid layout that works on phones (320px - 768px width)
4. Create two main sections:
   - **Video Section:** Display the remote desktop input box stream (takes 60% of screen)
   - **Control Section:** Input field for typing commands (takes 40% of screen)
5. Use CSS Media Queries for phone optimization
6. Implement PWA support (manifest.json) so it can be added to home screen

**UI Components to Create:**
- `RemoteVideoDisplay` - Shows WebRTC video stream
- `KeyboardInput` - Input field for typing
- `ConnectionStatus` - Shows connected/disconnected/connecting state
- `DebugPanel` - Shows FPS, bitrate, connection info (collapsible)
- `QRCodeDisplay` - Shows QR code with session ID for quick connection

### 2.2 WebRTC Peer Connection (Mobile/React)

**File:** `src/mobile/hooks/useWebRTC.js`

**Requirements:**
1. Create RTCPeerConnection on React component mount
2. Handle remote video track and display in video element
3. Create data channel for sending keystrokes to desktop
4. Implement offer/answer exchange via WebSocket signaling
5. Handle ICE candidates
6. Monitor connection state and update UI
7. Automatically send keystrokes when user types in input field
8. Handle video codec negotiation (prefer H.264)
9. Set receiving video bitrate limit to 1 Mbps
10. Implement connection timeout detection (30 seconds)

**Key Functions Needed:**
- `useWebRTC(signalingServerUrl)` - Custom hook
- `connectToDesktop(sessionId)` - Initiate connection to specific desktop
- `handleRemoteVideoTrack(track)` - Display received video stream
- `sendKeystroke(key)` - Send single keystroke to desktop
- `sendCommand(text)` - Send entire command/text block
- `disconnect()` - Close peer connection gracefully

**Example Hook Usage:**
```javascript
const {
  videoRef,
  isConnected,
  isConnecting,
  error,
  sendKeystroke,
  connectionStats
} = useWebRTC('ws://server-url');
```

### 2.3 Keyboard Input Handler

**File:** `src/mobile/components/KeyboardInput.jsx`

**Requirements:**
1. Create input field component
2. Capture all keyboard events: onKeyDown, onKeyUp, onChange
3. Send individual keystrokes in real-time to desktop via WebRTC data channel
4. Support all printable characters (a-z, A-Z, 0-9, special characters)
5. Support special keys:
   - Enter/Return
   - Backspace
   - Delete
   - Arrow keys (Up, Down, Left, Right)
   - Tab
   - Escape
   - Space
   - Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z, etc.
6. Add visual feedback: key press animation
7. Auto-focus input field on page load
8. Provide soft keyboard toggle for mobile browsers
9. Handle modifier keys: Shift, Ctrl, Alt, Cmd
10. Echo typed characters back to display for user confirmation

**Keystroke Format to Send:**
```javascript
{
  type: "keystroke",
  key: "a",
  code: "KeyA",
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false
  },
  timestamp: Date.now()
}
```

### 2.4 WebSocket Signaling Connection (Mobile)

**File:** `src/mobile/services/signalingClient.js`

**Requirements:**
1. Connect to signaling server via WebSocket
2. Send/receive SDP offers and answers
3. Send/receive ICE candidates
4. Register as "mobile" role with unique session ID
5. Implement heartbeat/ping-pong
6. Auto-reconnect with exponential backoff
7. Handle connection errors gracefully
8. Emit events for React components to subscribe to

**Messages to Implement:**
```
Mobile → Server:
- {"type": "register", "role": "mobile", "sessionId": "unique-id"}
- {"type": "answer", "sessionId": "...", "sdp": "..."}
- {"type": "ice-candidate", "sessionId": "...", "candidate": {...}}

Mobile ← Server:
- {"type": "offer-received", "sessionId": "...", "sdp": "..."}
- {"type": "ice-candidate", "sessionId": "...", "candidate": {...}}
```

---

## Part 3: Signaling Server (Backend)

### 3.1 Express.js + Socket.io Signaling Server

**File:** `src/server/index.js`

**Requirements:**
1. Create Express.js server on port 3000 (or configurable)
2. Implement Socket.io for WebSocket communication
3. Create session/room management system
4. Handle client registration (role: "desktop" or "mobile")
5. Route signals between desktop and mobile clients in same session
6. Manage ICE candidates queuing and delivery
7. Implement session timeout (5 minutes idle → cleanup)
8. Implement heartbeat/ping-pong every 30 seconds
9. Log all signaling events for debugging
10. Handle client disconnect gracefully (cleanup session)
11. Implement CORS for mobile web app access
12. Provide REST API endpoint to generate session IDs
13. Provide REST API endpoint to get session status (for QR code linking)

**Session Data Structure:**
```javascript
{
  sessionId: "unique-uuid",
  createdAt: timestamp,
  lastActivity: timestamp,
  desktop: {
    socketId: "socket-id",
    connected: true,
    stats: {
      bytesSent: number,
      messagesReceived: number
    }
  },
  mobile: {
    socketId: "socket-id",
    connected: true,
    stats: {
      bytesReceived: number,
      messagesSent: number
    }
  },
  iceCandidatesQueue: []
}
```

**Socket Events to Implement:**
```
'register' - Client registration
'offer' - SDP offer from desktop
'answer' - SDP answer from mobile
'ice-candidate' - ICE candidate
'disconnect' - Client disconnect
'ping' - Heartbeat
'pong' - Heartbeat response
'error' - Error message
```

**REST API Endpoints:**
```
POST /api/sessions/create - Create new session, return sessionId + QR code
GET /api/sessions/:sessionId/status - Get session status
GET /api/sessions/:sessionId/desktop-info - Get desktop client info
```

### 3.2 Session Management

**File:** `src/server/sessionManager.js`

**Requirements:**
1. In-memory session storage (use Map or simple object)
2. Create session with unique ID (use uuid library)
3. Store desktop and mobile client info per session
4. Track ICE candidates for each client
5. Implement session cleanup on timeout
6. Provide methods:
   - `createSession()` → sessionId
   - `registerClient(sessionId, role, socketId)` → {desktop/mobile}
   - `getSession(sessionId)` → session object
   - `addIceCandidate(sessionId, role, candidate)` → queue
   - `getQueuedCandidates(sessionId, role)` → candidates array
   - `deleteSession(sessionId)` → void
   - `cleanupExpiredSessions()` → void (run every 1 minute)

### 3.3 Signaling Events Routing

**File:** `src/server/signaling.js`

**Requirements:**
1. When desktop sends offer:
   - Validate session exists
   - Store offer with desktop client
   - If mobile connected, forward offer immediately
   - If mobile not connected, queue offer

2. When mobile sends answer:
   - Validate session exists
   - Forward answer to desktop immediately

3. For ICE candidates:
   - Queue candidates if recipient not yet connected
   - Deliver immediately if recipient connected
   - Deliver queued candidates on connection

4. Implement message validation and error handling
5. Log all signaling for debugging

---

## Part 4: Keystroke Simulation (Desktop)

### 4.1 Keyboard Input Simulation Module

**File:** `src/desktop/keystroke-simulator.js`

**Requirements:**
1. Use a keyboard automation library:
   - **Option A:** `robotjs` (Node.js native module)
   - **Option B:** Use OS-specific APIs via child_process + Python subprocess
2. Implement keystroke sending function that accepts:
   - Key code (e.g., "KeyA", "Enter", "Backspace")
   - Modifiers (shift, ctrl, alt, cmd)
3. Support all printable ASCII characters
4. Support special keys:
   - Enter/Return
   - Backspace
   - Delete
   - Tab
   - Escape
   - Arrow keys (Up, Down, Left, Right)
   - Home, End, PageUp, PageDown
5. Support modifier combinations (Ctrl+A, Shift+Enter, etc.)
6. Implement 50ms delay between keystrokes to prevent flooding
7. Handle focus window properly (ensure Antigravity window has focus)
8. Implement error handling and logging
9. Test with actual Antigravity IDE to verify input is received

**Implementation Example (using robotjs):**
```javascript
const robot = require('robotjs');

function sendKeystroke(keyCode, modifiers) {
  // Build modifier array: ["ctrl", "shift", "alt", "cmd"]
  const mods = [];
  if (modifiers.ctrl) mods.push('control');
  if (modifiers.shift) mods.push('shift');
  if (modifiers.alt) mods.push('alt');
  if (modifiers.cmd) mods.push('command');
  
  // Convert keyCode to robotjs key name
  const keyName = convertKeyCode(keyCode);
  
  // Send keystroke
  if (mods.length > 0) {
    robot.hotkey(...mods, keyName);
  } else {
    robot.typeString(keyName, 10); // 10ms between chars
  }
}
```

### 4.2 Window Focus Management

**File:** `src/desktop/window-focus.js`

**Requirements:**
1. Detect Antigravity window on desktop
2. Keep focus on Antigravity during input
3. Handle cases where focus is lost (allow user to re-focus)
4. Implement methods:
   - `findAntigravityWindow()` → window info
   - `focusWindow(windowId)` → void
   - `isAntigravityFocused()` → boolean
5. Use Electron's native modules or system APIs to manage windows

---

## Part 5: Configuration & Build Setup

### 5.1 Environment Configuration

**File:** `.env` and `.env.example`

**Variables:**
```
# Desktop
DESKTOP_PORT=3000
DESKTOP_VIDEO_FPS=30
DESKTOP_VIDEO_BITRATE=500
DESKTOP_KEYPRESS_DELAY=50
DESKTOP_INITIAL_REGION={"x": 0, "y": 0, "width": 400, "height": 50}

# Server
SERVER_PORT=3000
SERVER_HOST=localhost
SERVER_CORS_ORIGIN=http://localhost:3001
SESSION_TIMEOUT=300000 # 5 minutes
SIGNALING_SERVER_URL=ws://localhost:3000

# Mobile
REACT_APP_SIGNALING_SERVER=ws://localhost:3000
REACT_APP_VIDEO_BITRATE=1000
REACT_APP_DEBUG_MODE=true
```

### 5.2 Build & Deploy Configuration

**Files:**
- `package.json` - Dependencies for all three parts
- `electron-builder.config.js` - Electron desktop app build config
- `docker-compose.yml` - Docker setup for server
- `Dockerfile` - Server containerization
- `webpack.config.js` or Vite config for React app

**Required Dependencies:**
```
Desktop:
- electron
- robotjs (or alternative keyboard automation)
- webrtc (node-webrtc or similar)
- socket.io-client
- express

Server:
- express
- socket.io
- uuid
- cors
- dotenv

Mobile (React):
- react
- react-hooks
- socket.io-client
- webrtc-adapter
```

---

## Part 6: Testing Plan

### 6.1 Desktop App Testing

**Tests to Implement:**
1. Screen capture starts and stops correctly
2. Region cropping works (verify correct coordinates are captured)
3. Canvas stream has correct resolution (400x50 pixels)
4. 30 FPS is maintained
5. WebRTC connection establishes successfully
6. Data channel receives keystrokes
7. Keystrokes are correctly simulated on keyboard
8. Reconnection works after network interruption
9. UI overlay displays all required information

**Manual Testing:**
1. Launch Antigravity IDE
2. Run desktop app
3. Select the Antigravity input box region
4. Verify video stream is correct
5. Connect to mobile client
6. Type in mobile input field and verify characters appear in Antigravity

### 6.2 Mobile App Testing

**Tests to Implement:**
1. React app loads on mobile browser
2. Video stream displays correctly on phone screen
3. Input field receives focus on page load
4. Keystrokes are sent to desktop
5. Connection status updates correctly
6. Reconnection works after page refresh
7. Soft keyboard works on mobile browsers
8. UI is responsive and readable on different screen sizes

**Manual Testing:**
1. Open mobile web app on phone
2. Enter session ID or scan QR code
3. Verify video stream shows desktop input box
4. Type in input field
5. Verify text appears in Antigravity IDE

### 6.3 Server Testing

**Tests to Implement:**
1. Server starts and listens on correct port
2. Session creation returns valid sessionId
3. Desktop and mobile clients can register
4. Signaling messages are routed correctly
5. ICE candidates are queued and delivered
6. Sessions timeout correctly
7. Connection stats are tracked
8. Error handling works for invalid messages

---

## Part 7: Deployment Instructions

### 7.1 Local Development Setup

**Steps:**
1. Clone repository
2. Install dependencies for all three parts
3. Create `.env` file from `.env.example`
4. Start signaling server: `npm run server:start`
5. Start desktop app: `npm run desktop:start`
6. Start mobile app: `npm run mobile:start`
7. Open browser to `http://localhost:3001`
8. Run desktop app, select region, wait for connection
9. Enter session ID on mobile app

### 7.2 Production Deployment

**Server Deployment (choose one):**
- **Option A:** VPS (AWS, DigitalOcean, Linode)
  - Deploy via Docker Compose
  - Use Nginx reverse proxy with SSL
  - Use PM2 for process management

- **Option B:** Local Home Server
  - Run Docker container on home server
  - Use Ngrok or similar for public access (not recommended, security risk)
  - Or access only via local network VPN

**Desktop App Deployment:**
- Build executable: `npm run desktop:build`
- Distribute `.exe` (Windows) or `.dmg` (Mac) or `.AppImage` (Linux)
- Auto-update support (optional)

**Mobile App Deployment:**
- Build static files: `npm run mobile:build`
- Deploy to static hosting (Vercel, Netlify) or own server
- Add PWA manifest for app-like experience

### 7.3 SSL/TLS Setup

**Requirements:**
1. Use HTTPS for mobile web app
2. Use WSS (WebSocket Secure) for signaling
3. Obtain SSL certificate (Let's Encrypt free)
4. Configure Nginx reverse proxy with SSL
5. Set CORS headers properly

---

## Part 8: Detailed File Structure

```
project/
├── src/
│   ├── desktop/
│   │   ├── main.js                    # Electron app entry
│   │   ├── preload.js                 # Electron preload script
│   │   ├── webrtc-peer.js            # WebRTC peer connection
│   │   ├── signaling-client.js       # WebSocket signaling
│   │   ├── screen-capture.js         # Screen capture + cropping
│   │   ├── keystroke-simulator.js    # Keyboard automation
│   │   ├── window-focus.js           # Window focus management
│   │   ├── ui/
│   │   │   ├── main-window.html
│   │   │   ├── styles.css
│   │   │   └── app.js
│   │   └── config.js
│   │
│   ├── server/
│   │   ├── index.js                  # Express server entry
│   │   ├── socket-handler.js         # Socket.io events
│   │   ├── sessionManager.js         # Session management
│   │   ├── signaling.js              # Signaling logic
│   │   ├── middleware/
│   │   │   ├── cors.js
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   └── api.js
│   │   └── config.js
│   │
│   ├── mobile/
│   │   ├── index.jsx                 # React app entry
│   │   ├── App.jsx                   # Main app component
│   │   ├── hooks/
│   │   │   └── useWebRTC.js          # WebRTC hook
│   │   ├── components/
│   │   │   ├── RemoteVideoDisplay.jsx
│   │   │   ├── KeyboardInput.jsx
│   │   │   ├── ConnectionStatus.jsx
│   │   │   ├── DebugPanel.jsx
│   │   │   └── QRCodeDisplay.jsx
│   │   ├── services/
│   │   │   └── signalingClient.js
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   └── responsive.css
│   │   └── config.js
│   │
│   └── shared/
│       ├── constants.js              # Shared constants
│       └── utils.js                  # Shared utilities
│
├── .env.example
├── package.json
├── docker-compose.yml
├── Dockerfile
├── webpack.config.js (or vite.config.js)
├── electron-builder.config.js
└── README.md
```

---

## Part 9: Key Implementation Details & Tips

### 9.1 Screen Capture Permission Handling
- On first run, browser will request screen share permission
- Show user clear instructions on selecting the input box area
- Store selected coordinates in localStorage for next time

### 9.2 WebRTC Codec Selection
- Prefer H.264 for better mobile compatibility
- Fallback to VP8 if H.264 not available
- Set appropriate bitrate limits per platform

### 9.3 Keystroke Timing
- Send keystrokes individually, not as strings
- Add 50ms delay between keystrokes to prevent buffer overflow
- Queue keystrokes if desktop is busy

### 9.4 Error Handling Strategy
- Graceful degradation: show user-friendly error messages
- Implement automatic reconnection with exponential backoff
- Log all errors to console for debugging
- Provide debug panel to view connection stats

### 9.5 Mobile Optimization
- Use CSS media queries for responsive design
- Test on various phone sizes (320px, 375px, 414px, 768px)
- Ensure touch-friendly input controls
- Minimize bundle size for mobile web app

### 9.6 Security Considerations
- Use HTTPS/WSS in production
- Validate all WebSocket messages
- Implement rate limiting on signaling server
- Use JWT tokens for session authentication (optional)
- Never store sensitive data in localStorage
- Implement CORS properly

---

## Part 10: Success Criteria

**The project is complete when:**

1. ✅ Desktop app captures and displays input box region correctly
2. ✅ Mobile web app displays the live video stream in real-time (<500ms latency)
3. ✅ User can type in mobile input field and characters appear in Antigravity IDE
4. ✅ Special keys (Enter, Backspace, Arrows) work correctly
5. ✅ Modifier keys (Shift, Ctrl, etc.) work correctly
6. ✅ Video bitrate is optimized for mobile (<500 kbps on 4G)
7. ✅ Reconnection works after network interruption
8. ✅ Session management works (timeout, cleanup, etc.)
9. ✅ All three components communicate correctly via WebRTC + WebSocket
10. ✅ App is responsive and works on phones (320px+)
11. ✅ No console errors in any component
12. ✅ Manual testing with Antigravity IDE succeeds

---

## Part 11: Performance Targets

| Metric | Target |
|--------|--------|
| Initial Connection | <3 seconds |
| Keystroke Latency | <500ms (end-to-end) |
| Video FPS | 30 fps |
| Video Bitrate | 500 kbps desktop → 1 Mbps mobile |
| CPU Usage (Desktop) | <15% |
| CPU Usage (Mobile) | <10% |
| Memory (Desktop App) | <150 MB |
| Memory (Mobile App) | <80 MB |
| Bundle Size (Mobile) | <500 KB (gzipped) |

---

## Part 12: Future Enhancements (Optional)

After basic implementation works:
1. Add audio channel for voice commands
2. Implement mouse cursor control from phone
3. Add multi-session support (control multiple desktops)
4. Implement command history/autocomplete
5. Add screenshots/video recording of sessions
6. Implement gesture controls on mobile
7. Add dark/light theme toggle
8. Implement analytics dashboard
9. Add mobile app (native iOS/Android via React Native)
10. Implement end-to-end encryption for security

---

## Implementation Notes for Gemini AI

**You (or Gemini) should implement in this order:**

1. **Week 1:** Server + Signaling (Part 3)
2. **Week 1-2:** Desktop App capture (Part 4.1, 4.2)
3. **Week 2:** Desktop WebRTC peer (Part 2.2)
4. **Week 2-3:** Mobile React app (Part 2)
5. **Week 3:** Integration testing & debugging
6. **Week 3-4:** Optimization & production deployment

**Start with local development on single machine, then test across network.**

Each part is independent and can be developed/tested in parallel by different developers.

---

**End of Implementation Plan**

Provide this document to Gemini AI and ask it to implement all three parts sequentially.
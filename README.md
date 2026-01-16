# Antigravity Remote Control System

A system to remotely view and control the Antigravity IDE input box (or any desktop region) from a mobile device using WebRTC.

## Components

1.  **Server**: Node.js + Socket.io signaling server.
2.  **Desktop**: Electron app for screen capture and keystroke simulation.
3.  **Mobile**: React web app for remote viewing and control.

## Prerequisites

-   Node.js (v16+)
-   npm

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd antigravity-webrtc
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    (The default settings in `.env.example` should work for local development).

## Running the System

You need to run three separate processes.

### 1. Start the Signaling Server
This mediates the connection between Desktop and Mobile.
```bash
npm run server:start
```
*Runs on port 3000.*

### 2. Start the Mobile Client
This serves the React app for your phone (or second browser window).
```bash
npm run mobile:dev
```
*Runs on port 3001.*
-   Open `http://localhost:3001` in your browser.
-   **Note**: To test on a real phone, your phone must be on the same network. You will need to access it via your computer's local IP (e.g., `http://192.168.1.5:3001`). 
-   **Important**: WebRTC requires HTTPS for non-localhost addresses while using `getUserMedia` (screen sharing), but for the *receiving* mobile client, HTTP usually works if the *sending* side (Desktop) is secure or localhost. However, typically `vite --host` is needed to expose to network.

### 3. Start the Desktop App
This runs the Electron app that captures the screen.
```bash
npm run desktop:start
```
-   Click **"Start Capture"**.
-   Select the screen or window you want to share (e.g., the Antigravity IDE window).
-   Note the **Session ID** displayed at the top.

## Usage

1.  On the **Mobile App**, enter the **Session ID** from the Desktop App.
2.  Click **"Connect"**.
3.  Wait for the status to change to **"connected"**.
4.  You should see the video stream of the captured region.
5.  Type in the text box on the mobile app. The keystrokes will be sent to your desktop.
6.  **Tip**: Make sure the target window on your Desktop (e.g., the IDE) is focused so it receives the simulated keystrokes.

## Development

-   **Server Tests**: `npm test`
-   **Production Build (Mobile)**: `npm run mobile:build`

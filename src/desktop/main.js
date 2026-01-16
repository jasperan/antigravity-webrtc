const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const keystrokeSimulator = require('./keystroke-simulator');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 300,
        height: 200,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false // Important for security
        },
        alwaysOnTop: true, // Keep it visible
        frame: true
    });

    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    // Open DevTools for debugging (can be removed in prod)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
    createWindow();

    // Setup IPC handlers
    ipcMain.handle('get-desktop-sources', async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        return sources;
    });

    ipcMain.on('simulate-keystroke', (event, { key, modifiers }) => {
        try {
            keystrokeSimulator.sendKeystroke(key, modifiers);
        } catch (error) {
            console.error('Failed to simulate keystroke:', error);
        }
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

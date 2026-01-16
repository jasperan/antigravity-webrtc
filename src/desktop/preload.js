const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
    simulateKeystroke: (data) => ipcRenderer.send('simulate-keystroke', data)
});

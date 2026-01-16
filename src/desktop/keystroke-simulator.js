// Safe requirement for robotjs
let robot;
try {
    robot = require('robotjs');
} catch (e) {
    console.warn('robotjs not found or failed to load. Keystroke simulation will be disabled.');
}

const mapKey = (key) => {
    // Map web key codes to robotjs key names
    const keyMap = {
        'Enter': 'enter',
        'Backspace': 'backspace',
        'Delete': 'delete',
        'Tab': 'tab',
        'Escape': 'escape',
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        ' ': 'space',
        // Add more as needed
    };
    return keyMap[key] || key.toLowerCase();
};

function sendKeystroke(key, modifiers = []) {
    if (!robot) {
        console.log(`[Mock] Key: ${key}, Mods: ${modifiers}`);
        return;
    }

    const robotKey = mapKey(key);
    const robotMods = modifiers.map(m => {
        if (m === 'ctrl') return 'control';
        if (m === 'cmd') return 'command';
        return m;
    });

    // RobotJS doesn't support 'Shift' as a modifier in the same way for typing chars usually,
    // but for tapKey it does.
    // For typing strings: robot.typeString(key);
    // For control keys: robot.keyTap(key, modifiers);

    if (key.length === 1 && modifiers.length === 0) {
        robot.typeString(key);
    } else {
        robot.keyTap(robotKey, robotMods);
    }
}

module.exports = {
    sendKeystroke
};

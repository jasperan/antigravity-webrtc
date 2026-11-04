import React, { useState, useRef, useEffect } from 'react';

const Arrow = ({ d }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d={d} />
    </svg>
);

const KeyboardInput = ({ onKeystroke }) => {
    const [text, setText] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleKeyDown = (e) => {
        // Prevent default for some keys if needed, but we want the input to show what's typed usually?
        // Actually, if we are controlling a remote terminal/IDE, complex shortcuts like Ctrl-C might be intercepted by browser.
        // For mobile, we mainly rely on the virtual keyboard input (onChange/InputEvent) or specific key codes.

        const keyData = {
            key: e.key,
            code: e.code,
            modifiers: []
        };

        if (e.ctrlKey) keyData.modifiers.push('ctrl');
        if (e.shiftKey) keyData.modifiers.push('shift');
        if (e.altKey) keyData.modifiers.push('alt');
        if (e.metaKey) keyData.modifiers.push('cmd');

        // Send immediately
        onKeystroke(keyData);
    };

    const handleChange = (e) => {
        setText(e.target.value);
        // If we want to clear it to keep typing stream?
        // setText('');
        // But keeping it shows history.
    };

    // Special keys buttons
    const sendSpecial = (key, code) => {
        onKeystroke({ key, code, modifiers: [] });
        // Also re-focus input to keep keyboard up?
        if (inputRef.current) inputRef.current.focus();
    };

    const keys = [
        { label: 'up', aria: 'Arrow up', key: 'ArrowUp', code: 'ArrowUp', icon: 'm5 12 7-7 7 7M12 19V5' },
        { label: 'down', aria: 'Arrow down', key: 'ArrowDown', code: 'ArrowDown', icon: 'm5 12 7 7 7-7M12 5v14' },
        { label: 'left', aria: 'Arrow left', key: 'ArrowLeft', code: 'ArrowLeft', icon: 'M19 12H5m7 7-7-7 7-7' },
        { label: 'right', aria: 'Arrow right', key: 'ArrowRight', code: 'ArrowRight', icon: 'M5 12h14m-7-7 7 7-7 7' }
    ];

    const modifiers = [
        { label: 'Enter', key: 'Enter', code: 'Enter' },
        { label: 'Bksp', key: 'Backspace', code: 'Backspace' },
        { label: 'Tab', key: 'Tab', code: 'Tab' },
        { label: 'Esc', key: 'Escape', code: 'Escape' }
    ];

    return (
        <div className="keys">
            <textarea
                ref={inputRef}
                className="keys-input"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type into the remote"
                aria-label="Type into the remote"
            />

            <div className="key-grid">
                {keys.map((k) => (
                    <button
                        key={k.code}
                        type="button"
                        className="key"
                        aria-label={k.aria}
                        onClick={() => sendSpecial(k.key, k.code)}
                    >
                        <Arrow d={k.icon} />
                    </button>
                ))}
            </div>

            <div className="key-grid">
                {modifiers.map((k) => (
                    <button
                        key={k.code}
                        type="button"
                        className="key mod"
                        aria-label={k.label}
                        onClick={() => sendSpecial(k.key, k.code)}
                    >
                        {k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default KeyboardInput;

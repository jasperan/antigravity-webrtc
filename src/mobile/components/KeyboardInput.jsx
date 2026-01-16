import React, { useState, useRef, useEffect } from 'react';

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10, boxSizing: 'border-box' }}>
            <textarea
                ref={inputRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type here..."
                style={{
                    flex: 1,
                    width: '100%',
                    background: '#222',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: 10,
                    fontSize: '16px',
                    resize: 'none'
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 10, height: 50 }}>
                <button onClick={() => sendSpecial('ArrowUp', 'ArrowUp')}>↑</button>
                <button onClick={() => sendSpecial('ArrowDown', 'ArrowDown')}>↓</button>
                <button onClick={() => sendSpecial('ArrowLeft', 'ArrowLeft')}>←</button>
                <button onClick={() => sendSpecial('ArrowRight', 'ArrowRight')}>→</button>

                <button onClick={() => sendSpecial('Enter', 'Enter')}>Enter</button>
                <button onClick={() => sendSpecial('Backspace', 'Backspace')}>Bksp</button>
                <button onClick={() => sendSpecial('Tab', 'Tab')}>Tab</button>
                <button onClick={() => sendSpecial('Escape', 'Escape')}>Esc</button>
            </div>
        </div>
    );
};

export default KeyboardInput;

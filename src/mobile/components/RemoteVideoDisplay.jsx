import React, { useRef, useEffect } from 'react';

const RemoteVideoDisplay = ({ stream }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'black',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                <div style={{ color: '#666' }}>Waiting for video...</div>
            )}
        </div>
    );
};

export default RemoteVideoDisplay;

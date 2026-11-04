import React, { useRef, useEffect } from 'react';

const RemoteVideoDisplay = ({ stream }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="capture-frame">
            {stream ? (
                <video ref={videoRef} autoPlay playsInline muted />
            ) : (
                <div className="capture-empty">no capture yet</div>
            )}
        </div>
    );
};

export default RemoteVideoDisplay;

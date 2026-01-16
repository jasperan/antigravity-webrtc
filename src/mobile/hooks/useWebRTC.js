import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalingClient } from '../services/signalingClient';

export const useWebRTC = (serverUrl, sessionId) => {
    const [status, setStatus] = useState('disconnected');
    const [remoteStream, setRemoteStream] = useState(null);
    const peerConnection = useRef(null);
    const signaling = useRef(null);
    const dataChannel = useRef(null);

    const config = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const handleOffer = useCallback(async ({ sdp }) => {
        if (!peerConnection.current) return;
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            signaling.current.sendAnswer(answer);
        } catch (e) {
            console.error('Error handling offer:', e);
        }
    }, []);

    const handleCandidate = useCallback(async ({ candidate }) => {
        if (!peerConnection.current) return;
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error handling ICE candidate:', e);
        }
    }, []);

    const sendKeystroke = useCallback((keyData) => {
        if (dataChannel.current && dataChannel.current.readyState === 'open') {
            dataChannel.current.send(JSON.stringify({
                type: 'keystroke',
                ...keyData
            }));
        }
    }, []);

    useEffect(() => {
        if (!sessionId) return;

        // Init Signaling
        signaling.current = new SignalingClient(serverUrl, (st) => setStatus(st));

        // Init Peer Connection
        peerConnection.current = new RTCPeerConnection(config);

        peerConnection.current.ontrack = (event) => {
            console.log('Received remote track', event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                signaling.current.sendIceCandidate(event.candidate);
            }
        };

        peerConnection.current.ondatachannel = (event) => {
            console.log('Received data channel', event.channel.label);
            dataChannel.current = event.channel;
            dataChannel.current.onopen = () => console.log('Data channel opened');
        };

        // Connect callbacks
        signaling.current.onOffer = handleOffer;
        signaling.current.onIceCandidate = handleCandidate;

        // Connect
        signaling.current.connect(sessionId);

        return () => {
            if (peerConnection.current) peerConnection.current.close();
            if (signaling.current && signaling.current.socket) signaling.current.socket.disconnect();
        };
    }, [sessionId, serverUrl, handleOffer, handleCandidate]);

    return {
        status,
        remoteStream,
        sendKeystroke
    };
};

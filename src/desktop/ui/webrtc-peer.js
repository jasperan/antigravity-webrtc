export class WebRTCPeer {
    constructor(signalingClient, videoStream) {
        this.signaling = signalingClient;
        this.localStream = videoStream;
        this.peerConnection = null;

        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        // Setup signaling handlers
        this.signaling.onOffer = (data) => this.handleOffer(data); // Mobile usually sends answer, not offer, but symmetry is good
        this.signaling.onAnswer = (data) => this.handleAnswer(data);
        this.signaling.onIceCandidate = (data) => this.handleCandidate(data);
        this.signaling.onClientConnected = () => this.startConnection(); // Desktop initiates
    }

    async startConnection() {
        console.log('Starting WebRTC connection...');
        this.createPeerConnection();

        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.signaling.sendOffer(offer);
        } catch (e) {
            console.error('Error creating offer:', e);
        }
    }

    createPeerConnection() {
        if (this.peerConnection) return;

        this.peerConnection = new RTCPeerConnection(this.config);

        // Add local stream (video only)
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signaling.sendIceCandidate(event.candidate);
            }
        };

        // Data Channel for receiving keystrokes
        // Desktop waits for data channel from Mobile? Or creates it? 
        // Plan says "Create data channel named 'keyboard-input' for receiving keystrokes".
        // Usually usage is: one side creates, other receives 'ondatachannel'.
        // If Desktop acts as "offerer" (caller), it can create it.
        const dataChannel = this.peerConnection.createDataChannel("keyboard-input");
        this.setupDataChannel(dataChannel);
    }

    setupDataChannel(channel) {
        channel.onopen = () => console.log('Data channel open');
        channel.onmessage = (event) => {
            // Keystroke received
            console.log('Received message:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'keystroke') {
                    window.electronAPI.simulateKeystroke(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
    }

    async handleAnswer({ sdp }) {
        if (!this.peerConnection) return;
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (e) {
            console.error('Error handling answer:', e);
        }
    }

    async handleCandidate({ candidate }) {
        if (!this.peerConnection) return;
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error handling ICE candidate:', e);
        }
    }
}

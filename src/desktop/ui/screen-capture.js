export class ScreenCapturer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.videoElement = document.createElement('video');
        this.stream = null;
        this.isCapturing = false;
        this.cropRegion = { x: 0, y: 0, width: 400, height: 50 }; // Default
        this.animationFrameId = null;
    }

    async startCapture(sourceId) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                }
            });

            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            this.isCapturing = true;
            this.drawLoop();
            return true;
        } catch (e) {
            console.error('Error getting display media:', e);
            return false;
        }
    }

    stopCapture() {
        this.isCapturing = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    setCropRegion(region) {
        this.cropRegion = region;
        // Update canvas size to match crop region
        this.canvas.width = region.width;
        this.canvas.height = region.height;
    }

    drawLoop() {
        if (!this.isCapturing) return;

        // Draw cropped region from video to canvas
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        this.ctx.drawImage(
            this.videoElement,
            this.cropRegion.x, this.cropRegion.y, this.cropRegion.width, this.cropRegion.height,
            0, 0, this.cropRegion.width, this.cropRegion.height
        );

        this.animationFrameId = requestAnimationFrame(() => this.drawLoop());
    }

    getStream() {
        return this.canvas.captureStream(30); // 30 FPS
    }
}

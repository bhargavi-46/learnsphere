// --- Video Player Speed Control & Glow Effect ---
const speedControl = document.getElementById('speed-control');
const videoPlayer = document.getElementById('course-video-player');
const videoWrapper = document.getElementById('video-player-wrapper');

function setupVideoPlayer() {
    if (speedControl && videoPlayer) {
        // Set initial playback rate based on select value when loaded
        videoPlayer.playbackRate = parseFloat(speedControl.value);

        speedControl.addEventListener('change', (e) => {
            videoPlayer.playbackRate = parseFloat(e.target.value);
        });
    }

    if (videoPlayer && videoWrapper) {
        videoPlayer.addEventListener('play', () => {
            videoWrapper.classList.add('video-playing-glow');
        });
        videoPlayer.addEventListener('pause', () => {
            videoWrapper.classList.remove('video-playing-glow');
        });
        videoPlayer.addEventListener('ended', () => {
            videoWrapper.classList.remove('video-playing-glow');
        });
    } else {
        console.log("Video player or wrapper element not found for JS setup.");
    }
}

// Run setup when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupVideoPlayer);
} else {
    setupVideoPlayer(); // DOMContentLoaded has already fired
}

console.log("Video Player JS loaded.");
// gpt-5-mini — December 1, 2025
const audio = document.getElementById('audio');
const playPause = document.getElementById('playPause');
const timeDisplay = document.getElementById('time');
const vttTrackElement = document.getElementById('vtt-track');
const article = document.getElementById('article');

// Map from cue id (or index) to DOM element(s)
const cueToElements = new Map();

// Utility: format seconds to mm:ss
function formatTime(s) {
    if (!isFinite(s)) return '00:00';
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
}

// After the track is ready, read cues
function setupTrack() {
    const track = Array.from(audio.textTracks).find(t => t.kind === 'subtitles' || t.kind === 'captions');
    if (!track) return;
    // Ensure cues are loaded (some browsers load cues asynchronously)
    track.mode = 'hidden'; // allow cuechange events while not showing default captions
    // Build mapping: we expect VTT cue text to include an identifier referencing paragraph(s).
    // Example VTT cue text: "<p id='p2'>Here is the second paragraph...</p>"
    // Or simply plain text "p2" to reference paragraph with data-para-id.
    function mapCues() {
        console.log("hello");
        for (let i = 0; i < track.cues.length; i++) {
            const cue = track.cues[i];
            console.log("cue", cue);
            const key = cue.text;
            console.log("key", key);
            const el = document.getElementById(key);
            cueToElements.set(key, el || null);
            // attach the cue object for easy lookup
            cue._metaKey = key;
        }
    }

    // Rebuild mapping once cues loaded
    if (track.cues && track.cues.length) {
        mapCues();
    } else {
        // try again when cues change
        track.addEventListener('cuechange', mapCues, { once: true });
    }

    // Listen to cue changes to highlight
    track.addEventListener('cuechange', () => {
        const active = Array.from(track.activeCues || []);
        // Clear all highlights
        document.querySelectorAll('.paragraph-highlight').forEach(el => el.classList.remove('paragraph-highlight'));
        if (active.length === 0) return;
        // For each active cue, highlight mapped element. If mapping missing, fallback to matching by time.
        active.forEach(cue => {
            const key = cue._metaKey || cue.id || `cue-${Array.prototype.indexOf.call(track.cues, cue)}`;
            const el = cueToElements.get(key) || null;
            if (el) el.classList.add('paragraph-highlight');
            else {
                // fallback: find paragraph whose data-start/data-end attributes match cue times
                const fallback = Array.from(article.querySelectorAll('p[data-start][data-end]')).find(p => {
                    const s = parseFloat(p.getAttribute('data-start')), e = parseFloat(p.getAttribute('data-end'));
                    return cue.startTime >= s && cue.startTime < e;
                });
                if (fallback) fallback.classList.add('paragraph-highlight');
            }
            // Optionally scroll into view
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    });
}

// Update time display and duration
function updateTime() {
    timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
}

// Play/pause button
playPause.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playPause.textContent = '⏸';
    } else {
        audio.pause();
        playPause.textContent = '▶';
    }
});

audio.addEventListener('loadedmetadata', updateTime);
audio.addEventListener('timeupdate', updateTime);

// Setup track when available
if (audio.textTracks && audio.textTracks.length) {
    // Some browsers create TextTrack objects only after load; wait a short time
    setTimeout(setupTrack, 50);
} else {
    audio.addEventListener('loadedmetadata', setupTrack, { once: true });
}

// Optional: click paragraph to seek audio to its cue start (requires data-start attrs or mapping)
article.addEventListener('click', (e) => {
    const p = e.target.closest('p[data-start]');
    if (!p) return;
    const s = parseFloat(p.getAttribute('data-start'));
    if (isFinite(s)) {
        audio.currentTime = s + 0.01;
        audio.play();
        playPause.textContent = '⏸';
    }
});

/**
 * Soul-Sync 2026: Thane Friend Edition
 */

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    history: [],
    isRecording: false,
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const mediaCard = document.getElementById('media-card');
const mediaContent = document.getElementById('media-content');

function init() {
    if (!state.keys.gemini || state.keys.gemini === '00') {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    updateUI();
}

// 1. Voice Control
async function handleVoice() {
    if (state.isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        let chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => processAudio(new Blob(chunks, { type: 'audio/webm' }));

        recorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "...";

        voiceBtn.onclick = () => {
            recorder.stop();
            state.isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.onclick = handleVoice;
        };
    } catch (e) { alert("Mic required."); }
}
voiceBtn.onclick = handleVoice;

// 2. Audio Processing (Sarvam STT)
async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    // We send multilang code so Sarvam detects the language
    formData.append('language_code', 'mul'); 

    try {
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam },
            body: formData
        });
        const data = await res.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> ${data.transcript}`;
            state.history.push({ role: "user", content: data.transcript });
            getFriendResponse(data.transcript);
        }
    } catch (e) { transcriptEl.textContent = "STT Error."; }
}

// 3. AI Brain (Gemini 3.1 Flash)
async function getFriendResponse(userText) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    const systemPrompt = `You are Soul-Sync, a close personal friend living in Thane, Maharashtra. 
    1. Respond strictly in the SAME LANGUAGE the user spoke (Marathi, Hindi, or English).
    2. Be warm, casual, and highly informative. 
    3. If asked about weather/places, use your 2026 knowledge (Thane is warm/humid, Upvan Lake, Viviana Mall, etc.).
    4. If appropriate, suggest a YouTube video or a recipe.
    5. Silently track personality (MBTI).
    OUTPUT ONLY JSON: 
    {"friend_reply": "text", "detected_mbti": "XXXX or Analyzing", "media": {"type": "youtube/weather/recipe", "title": "name", "link_or_info": "data"}}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${userText}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });
        const data = await response.json();
        const jsonStr = data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0];
        const res = JSON.parse(jsonStr);

        // Update Personality
        if (res.detected_mbti !== "Analyzing") {
            state.mbti = res.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        // Show Media Card if AI suggested something
        if (res.media) {
            mediaCard.classList.remove('hidden');
            document.getElementById('media-label').textContent = res.media.type.toUpperCase();
            mediaContent.innerHTML = `<div style="color:var(--accent); font-weight:bold;">${res.media.title}</div><div>${res.media.link_or_info}</div>`;
        }

        // Final Response
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${res.friend_reply}`;
        state.history.push({ role: "assistant", content: res.friend_reply });

        // TTS (Matches language automatically)
        const speech = new SpeechSynthesisUtterance(res.friend_reply);
        window.speechSynthesis.speak(speech);

    } catch (e) { transcriptEl.textContent = "AI Friend is offline."; }
}

function updateUI() {
    document.getElementById('mbti-type').textContent = state.mbti;
}

document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', document.getElementById('gemini-key').value);
    localStorage.setItem('sarvam_key', document.getElementById('sarvam-key').value);
    location.reload();
};

init();

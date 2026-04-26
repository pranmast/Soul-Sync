/**
 * Soul-Sync 2026: Thane Friend Edition
 * Reverted to stable Sarvam STT logic
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
    if (!state.keys.gemini || state.keys.gemini === '00' || !state.keys.sarvam) {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    updateUI();
}

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
        transcriptEl.textContent = "Listening...";

        voiceBtn.onclick = () => {
            recorder.stop();
            state.isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.onclick = handleVoice;
        };
    } catch (e) { alert("Mic required."); }
}
voiceBtn.onclick = handleVoice;

// REVERTED: Using the stable STT logic
async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v1'); 
    // If you want it to detect between English/Hindi/Marathi, 'mul' is used
    formData.append('language_code', 'mul'); 

    try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam },
            body: formData
        });

        if (!response.ok) throw new Error(`Status: ${response.status}`);

        const data = await response.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> ${data.transcript}`;
            state.history.push({ role: "user", content: data.transcript });
            getFriendResponse(data.transcript);
        }
    } catch (err) {
        console.error("Sarvam Error:", err);
        transcriptEl.textContent = "Error with voice processing. Check your Sarvam Key.";
    }
}

async function getFriendResponse(userText) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    // Thane Personal Context: Upvan Lake, Viviana, Gaimukh, Weather etc.
    const systemPrompt = `You are Soul-Sync, a helpful and personal friend from Thane, Maharashtra.
    1. Reply in the EXACT same language the user spoke (Marathi, Hindi, or English).
    2. Be informative about Thane weather, locations, and events.
    3. If they ask for help, suggest YouTube videos or recipes in the media card.
    4. Stay on subject until they say "Ok bye".
    5. No questionnaire style—keep it a natural conversation.
    OUTPUT JSON: {"friend_reply": "...", "detected_mbti": "XXXX", "media": {"type": "...", "title": "...", "link_or_info": "..."}}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${userText}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);

        if (res.detected_mbti !== "Analyzing") {
            state.mbti = res.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        if (res.media && res.media.title) {
            mediaCard.classList.remove('hidden');
            mediaContent.innerHTML = `<div style="color:var(--accent); font-weight:bold;">${res.media.title}</div><div>${res.media.link_or_info}</div>`;
        }

        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${res.friend_reply}`;
        state.history.push({ role: "assistant", content: res.friend_reply });

        const speech = new SpeechSynthesisUtterance(res.friend_reply);
        window.speechSynthesis.speak(speech);
    } catch (e) { transcriptEl.textContent = "AI connection error."; }
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

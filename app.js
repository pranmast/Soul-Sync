/**
 * Soul-Sync 2026: Thane Friend Edition (Bug Fixed)
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

async function handleVoice() {
    if (state.isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Use standard webm/opus for broad compatibility
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        let chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            processAudio(blob);
        };

        recorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "ऐकतोय... (Listening)";

        voiceBtn.onclick = () => {
            recorder.stop();
            state.isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.onclick = handleVoice;
        };
    } catch (e) { alert("Mic required for our chat!"); }
}
voiceBtn.onclick = handleVoice;

async function processAudio(blob) {
    const formData = new FormData();
    // Correcting the file naming and field for Sarvam v3
    formData.append('file', blob, 'input_audio.webm');
    formData.append('model', 'saaras:v1'); // v1 is often more stable for 'mul' detection
    formData.append('language_code', 'mul'); 

    try {
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 
                'api-subscription-key': state.keys.sarvam 
                // Note: Do NOT set Content-Type header manually with FormData
            },
            body: formData
        });

        if (!res.ok) throw new Error(`STT Error: ${res.status}`);
        
        const data = await res.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">तुम्ही:</span> ${data.transcript}`;
            state.history.push({ role: "user", content: data.transcript });
            getFriendResponse(data.transcript);
        }
    } catch (e) { 
        console.error(e);
        transcriptEl.textContent = "माफ करा, आवाज नीट ऐकू आला नाही. (Audio processing failed)"; 
    }
}

async function getFriendResponse(userText) {
    transcriptEl.textContent = "विचार करतोय... (Thinking)";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    const systemPrompt = `You are Soul-Sync, a chill friend from Thane. 
    1. Reply in the EXACT language user uses (Marathi, Hindi, or English). 
    2. Don't be a robot. If they ask about Thane events or weather, give real info.
    3. If they want suggestions, show a YouTube link or a recipe in the media card.
    4. Keep it conversational. No "Question 1...". 
    5. If they say "Ok bye", wish them well.
    OUTPUT JSON: {"friend_reply": "text", "detected_mbti": "XXXX", "media": {"type": "youtube/weather/event", "title": "name", "link_or_info": "data"}}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${userText}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);

        // Update UI
        if (res.detected_mbti && res.detected_mbti !== "Analyzing") {
            state.mbti = res.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        if (res.media) {
            mediaCard.classList.remove('hidden');
            mediaContent.innerHTML = `<div style="color:var(--accent); font-weight:bold;">${res.media.title}</div><div>${res.media.link_or_info}</div>`;
        }

        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${res.friend_reply}`;
        state.history.push({ role: "assistant", content: res.friend_reply });

        // TTS
        const speech = new SpeechSynthesisUtterance(res.friend_reply);
        window.speechSynthesis.speak(speech);

    } catch (e) { transcriptEl.textContent = "AI connection dropped."; }
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

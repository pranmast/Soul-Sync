/**
 * Soul-Sync 2026: Thane Friend Edition
 * Features: Mic Animation, Multilingual Talk-back, Thane Local Context
 */

// 1. MBTI and Partnership Traits Data
const PERSONALITY_DATA = {
    "INTP": {
        title: "The Architect",
        desc: "Logical, independent, and non-conformist. You value deep intellectual connection.",
        husband: "The 'Space-Giver'. You solve problems with logic and don't demand traditional roles.",
        compatibility: ["INFJ", "ENFJ", "ENTP"]
    },
    "INTJ": {
        title: "The Mastermind",
        desc: "Strategic, private, and fiercely ambitious.",
        husband: "The 'Visionary Partner'. You lead with long-term strategy and security.",
        compatibility: ["ENFP", "ENTP", "INFJ"]
    },
    "INFP": {
        title: "The Mediator",
        desc: "Poetic, kind, and seeking soul-deep connections.",
        husband: "The 'Gentle Soul'. Supportive of your partner's wildest dreams.",
        compatibility: ["ENFJ", "ENTJ", "INFJ"]
    },
    "ENTP": {
        title: "The Debater",
        desc: "Quick-witted and expressive. You keep life interesting.",
        husband: "The 'Idea Generator'. You challenge your partner to constant growth.",
        compatibility: ["INFJ", "INTJ", "ENFP"]
    }
};

// 2. State Management
let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    history: [],
    isRecording: false,
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

// 3. UI Elements
const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const typeEl = document.getElementById('mbti-type');
const descEl = document.getElementById('mbti-desc');
const traitsEl = document.getElementById('traits-list');
const mediaCard = document.getElementById('media-card');
const mediaContent = document.getElementById('media-content');

// 4. Initialization
function init() {
    if (!state.keys.gemini || state.keys.gemini === '00') {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    updateUI();
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Keep talking to map your vibe.", husband: "...", compatibility: [] };
    typeEl.textContent = state.mbti;
    descEl.textContent = data.desc;
    if (traitsEl) {
        traitsEl.innerHTML = `
            <div class="label">Partner Profile</div>
            <p>${data.husband}</p>
            <div class="label" style="margin-top:10px;">Best Match</div>
            <p>${data.compatibility.join(', ') || '...'}</p>
        `;
    }
}

// 5. Voice & Animation Logic
let mediaRecorder;
let audioChunks = [];

voiceBtn.onclick = async () => {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
};

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(audioChunks, { type: 'audio/webm' }));
        
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording'); // Starts CSS animation
        transcriptEl.textContent = "Listening...";
    } catch (err) {
        alert("Mic access is required for Soul-Sync.");
    }
}

function stopRecording() {
    mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording'); // Stops CSS animation
    transcriptEl.textContent = "Processing...";
}

// 6. Speech-to-Text (Sarvam v3)
async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'mul'); // Multi-language detection

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
    } catch (e) {
        transcriptEl.textContent = "Voice connection failed.";
    }
}

// 7. AI Brain & Language Mirroring
async function getFriendResponse(userText) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.keys.gemini}`;

    const systemPrompt = `You are Soul-Sync, a personal friend from Thane. 
    CONTEXT: It is Sunday, April 26, 2026. Thane is hot (41°C high).
    1. Reply in the SAME LANGUAGE as the user (Marathi, Hindi, or English).
    2. Be warm and deep. If they ask for plans, suggest indoor spots like Viviana Mall or evening at Upvan Lake.
    3. Suggest a YouTube video/recipe if helpful.
    4. Stay in character until they say "Ok bye".
    OUTPUT JSON: {"reply": "...", "mbti": "XXXX", "media": {"title": "...", "info": "..."}}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${userText}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });
        
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);

        // Update MBTI
        if (res.mbti && res.mbti !== "Analyzing") {
            state.mbti = res.mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        // Media Suggestion
        if (res.media) {
            mediaCard.classList.remove('hidden');
            mediaContent.innerHTML = `<strong>${res.media.title}</strong><p>${res.media.info}</p>`;
        }

        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${res.reply}`;
        state.history.push({ role: "assistant", content: res.reply });
        
        speak(res.reply);
    } catch (e) { transcriptEl.textContent = "Gemini is offline."; }
}

// 8. Dynamic Talk-back (Language Detection)
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detect Devanagari (Marathi/Hindi) vs Latin (English)
    const isIndic = /[\u0900-\u097F]/.test(text);
    utterance.lang = isIndic ? 'mr-IN' : 'en-IN'; 

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(utterance.lang));
    if (voice) utterance.voice = voice;

    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

// Settings form
document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', document.getElementById('gemini-key').value);
    localStorage.setItem('sarvam_key', document.getElementById('sarvam-key').value);
    location.reload();
};

init();

/**
 * Soul-Sync 2026: Dual-Mode MBTI & Chat
 */

const PERSONALITY_DATA = {
    "INTP": { title: "The Architect", desc: "Logical, independent, and non-conformist.", husband: "The 'Space-Giver'. Respects autonomy and solves problems with logic.", compatibility: ["INFJ", "ENFJ", "ENTP"] },
    "INTJ": { title: "The Mastermind", desc: "Strategic, private, and fiercely ambitious.", husband: "The 'Visionary Partner'. Leads with long-term strategy.", compatibility: ["ENFP", "ENTP", "INFJ"] },
    "INFP": { title: "The Mediator", desc: "Poetic, kind, and altruistic.", husband: "The 'Gentle Soul'. Supportive of dreams and idealistic.", compatibility: ["ENFJ", "ENTJ", "INFJ"] },
    "ENTP": { title: "The Debater", desc: "Quick-witted, expressive, and loves a challenge.", husband: "The 'Idea Generator'. Constant adventure and growth.", compatibility: ["INFJ", "INTJ", "ENFP"] },
    "ENTJ": { title: "The Commander", desc: "Decisive, efficient, and natural-born leaders.", husband: "The 'Reliable Leader'. Provider and protector focusing on excellence.", compatibility: ["INFP", "INTP", "ENFP"] },
    "ENFJ": { title: "The Protagonist", desc: "Warm, empathetic, and organized.", husband: "The 'Guardian of Harmony'. Attentive to emotional needs.", compatibility: ["INFP", "ISFP", "INTP"] }
};

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    mode: 'assessment', 
    language: 'en-IN',
    isRecording: false,
    history: [], 
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

// UI Elements
const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const modeToggle = document.getElementById('mode-toggle');
const langSelect = document.getElementById('language-select');
const settingsModal = document.getElementById('settings-modal');

function init() {
    if (!state.keys.gemini || state.keys.gemini === '00' || !state.keys.sarvam) {
        settingsModal.classList.remove('hidden');
    }

    modeToggle.addEventListener('change', (e) => {
        state.mode = e.target.value;
        state.history = []; // Reset history for fresh mode start
        transcriptEl.textContent = state.mode === 'assessment' ? "Assessment Mode: Ready." : "Chat Mode: Ready.";
    });

    langSelect.addEventListener('change', (e) => state.language = e.target.value);

    updateUI();
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Speak to reveal your type.", husband: "Pending assessment." };
    document.getElementById('mbti-type').textContent = state.mbti;
    document.getElementById('mbti-desc').textContent = data.desc;
    document.getElementById('traits-list').innerHTML = `<p>${data.husband}</p>`;
}

// Recording Logic
let mediaRecorder;
let audioChunks = [];

voiceBtn.addEventListener('click', async () => {
    if (state.isRecording) {
        mediaRecorder.stop();
        state.isRecording = false;
        voiceBtn.classList.remove('recording');
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(audioChunks, { type: 'audio/webm' }));
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "Listening...";
    }
});

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', state.language);

    try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam },
            body: formData
        });
        const data = await response.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<strong>You:</strong> "${data.transcript}"`;
            state.history.push({ role: "user", content: data.transcript });
            runAI();
        }
    } catch (err) {
        transcriptEl.textContent = "STT Error.";
    }
}

async function runAI() {
    transcriptEl.textContent = "Processing...";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    let instruction = "";
    if (state.mode === 'assessment') {
        instruction = `You are a Psychological MBTI Expert. 
        TASK: Ask ONE question at a time to identify if the user is E/I, S/N, T/F, or J/P. 
        Keep track of responses in history. If certain, provide the 4-letter MBTI.
        FORMAT: JSON ONLY: {"response": "insight", "next_question": "question", "detected_mbti": "XXXX or Analyzing"}`;
    } else {
        instruction = `You are a helpful AI assistant. 
        TASK: Answer the user's question accurately in ${state.language}.
        FORMAT: JSON ONLY: {"response": "answer", "next_question": "follow-up", "detected_mbti": "Analyzing"}`;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${instruction}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });

        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);

        if (res.detected_mbti !== "Analyzing") {
            state.mbti = res.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        const fullText = `${res.response} ${res.next_question}`;
        transcriptEl.innerHTML = `<strong>Soul-Sync:</strong> ${fullText}`;
        state.history.push({ role: "assistant", content: fullText });
        
        const speech = new SpeechSynthesisUtterance(fullText);
        speech.lang = state.language;
        window.speechSynthesis.speak(speech);

    } catch (err) {
        transcriptEl.textContent = "AI Error.";
    }
}

// Settings Form
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.keys.gemini = document.getElementById('gemini-key').value;
    state.keys.sarvam = document.getElementById('sarvam-key').value;
    localStorage.setItem('gemini_key', state.keys.gemini);
    localStorage.setItem('sarvam_key', state.keys.sarvam);
    settingsModal.classList.add('hidden');
    init();
});

init();

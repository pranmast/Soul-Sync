/**
 * Soul-Sync 2026: Multimodal MBTI & Chat Assistant
 * STT: Sarvam AI | LLM: Gemini 3.1 Flash
 */

const PERSONALITY_DATA = { /* Keep your existing MBTI data object here */ };

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    mode: 'assessment', // 'assessment' or 'chat'
    language: 'en-IN',
    history: [],
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

// UI Selectors
const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const modeToggle = document.getElementById('mode-toggle');
const langSelect = document.getElementById('language-select');

// Initialize
function init() {
    if (!state.keys.gemini || state.keys.gemini === '00') {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    
    // Listen for Mode/Language changes
    modeToggle.addEventListener('change', (e) => {
        state.mode = e.target.value;
        state.history = []; // Clear history when switching modes
        transcriptEl.textContent = state.mode === 'assessment' ? "Starting MBTI assessment..." : "Free Chat mode active.";
    });

    langSelect.addEventListener('change', (e) => state.language = e.target.value);
    
    updateUI();
}

// Voice Recording Logic
let mediaRecorder;
let audioChunks = [];

voiceBtn.addEventListener('click', async () => {
    if (state.isRecording) {
        mediaRecorder.stop();
        state.isRecording = false;
        voiceBtn.classList.remove('recording');
    } else {
        startRecording();
    }
});

async function startRecording() {
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

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', state.language); // Dynamic language for STT

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
        transcriptEl.textContent = "Voice processing error.";
    }
}

// Core AI Orchestrator
async function runAI() {
    transcriptEl.textContent = "Soul-Sync is thinking...";
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    // 1. Contextualize based on Mode
    let systemInstructions = "";
    if (state.mode === 'assessment') {
        systemInstructions = `You are a world-class MBTI practitioner. 
        GOAL: Identify the user's MBTI type through natural conversation.
        CURRENT TASK: Analyze the conversation history. Ask ONE clever, open-ended question to distinguish between MBTI letters (E vs I, S vs N, etc.). 
        If you have enough data, finalize the MBTI type.
        RESPONSE FORMAT: Return JSON only: {"response": "Natural feedback", "next_question": "Your next inquiry", "detected_mbti": "XXXX or Analyzing"}`;
    } else {
        systemInstructions = `You are a helpful AI assistant. 
        GOAL: Answer the user's queries accurately.
        LANGUAGE: Respond strictly in the language corresponding to code: ${state.language}.
        RESPONSE FORMAT: Return JSON only: {"response": "Your detailed answer", "next_question": "A follow-up to keep chatting", "detected_mbti": "Analyzing"}`;
    }

    const payload = {
        contents: [{ 
            parts: [{ text: `${systemInstructions}\n\nHistory: ${JSON.stringify(state.history)}` }] 
        }]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch[0]);

        // Update Global State if MBTI is found
        if (result.detected_mbti !== "Analyzing" && state.mode === 'assessment') {
            state.mbti = result.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        const fullText = `${result.response} ${result.next_question}`;
        transcriptEl.innerHTML = `<strong>Soul-Sync:</strong> ${fullText}`;
        state.history.push({ role: "assistant", content: fullText });
        
        // Voice Output
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = state.language; 
        window.speechSynthesis.speak(utterance);

    } catch (err) {
        transcriptEl.textContent = "AI Analysis failed.";
    }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Keep talking to discover your type." };
    document.getElementById('mbti-type').textContent = state.mbti;
    document.getElementById('mbti-desc').textContent = data.desc;
}

init();

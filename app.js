/**
 * Soul-Sync 2026: Automatic MBTI Extraction
 */

const PERSONALITY_DATA = {
    "INTP": { title: "The Architect", desc: "Logical, independent, and non-conformist.", husband: "The 'Space-Giver'. Solves problems with logic over emotion.", compatibility: ["INFJ", "ENFJ"] },
    "INTJ": { title: "The Mastermind", desc: "Strategic and fiercely ambitious.", husband: "The 'Visionary Partner'. Leads with long-term security.", compatibility: ["ENFP", "ENTP"] },
    "INFP": { title: "The Mediator", desc: "Poetic, kind, and altruistic.", husband: "The 'Gentle Soul'. Idealistic and deeply supportive.", compatibility: ["ENFJ", "ENTJ"] },
    "INFJ": { title: "The Advocate", desc: "Quiet, mystical, and inspiring.", husband: "The 'Soul Connector'. Deeply intuitive and protective.", compatibility: ["ENTP", "ENFP"] },
    "ENTP": { title: "The Debater", desc: "Quick-witted and loves a challenge.", husband: "The 'Idea Generator'. Constant adventure and wit.", compatibility: ["INFJ", "INTJ"] }
};

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    mode: 'assessment',
    language: 'en-IN',
    history: [],
    isRecording: false,
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const modeToggle = document.getElementById('mode-toggle');
const langSelect = document.getElementById('language-select');

function init() {
    if (!state.keys.gemini || state.keys.gemini === '00') {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    modeToggle.addEventListener('change', (e) => state.mode = e.target.value);
    langSelect.addEventListener('change', (e) => state.language = e.target.value);
    updateUI();
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        let chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(chunks, { type: 'audio/webm' }));
        
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "Listening...";
        
        voiceBtn.onclick = () => {
            mediaRecorder.stop();
            state.isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.onclick = startRecording; 
        };
    } catch (err) { alert("Mic required."); }
}
voiceBtn.onclick = startRecording;

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
            transcriptEl.innerHTML = `<strong>You:</strong> ${data.transcript}`;
            state.history.push({ role: "user", content: data.transcript });
            runAI();
        }
    } catch (e) { transcriptEl.textContent = "STT Error."; }
}

async function runAI() {
    transcriptEl.textContent = "Soul-Sync is thinking...";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    const assessmentPrompt = `You are Soul-Sync. Your goal is to find the user's MBTI by having a fun, casual conversation. 
    Do NOT act like a test. Ask about their day, how they handle stress, or their favorite way to relax.
    Silent Task: Use their replies to categorize them into E/I, S/N, T/F, J/P.
    JSON Output: {"response": "Natural reply", "next_question": "Fun follow up", "detected_mbti": "XXXX or Analyzing"}`;

    const chatPrompt = `You are a helpful AI. Respond in ${state.language}. 
    JSON Output: {"response": "Reply", "next_question": "Follow up", "detected_mbti": "Analyzing"}`;

    const prompt = state.mode === 'assessment' ? assessmentPrompt : chatPrompt;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\nHistory: ${JSON.stringify(state.history)}` }] }] })
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
    } catch (e) { transcriptEl.textContent = "AI Analysis Error."; }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Let's keep talking!", husband: "Learning your traits..." };
    document.getElementById('mbti-type').textContent = state.mbti;
    document.getElementById('mbti-desc').textContent = data.desc;
    document.getElementById('traits-list').innerHTML = `<p>${data.husband}</p>`;
}

document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', document.getElementById('gemini-key').value);
    localStorage.setItem('sarvam_key', document.getElementById('sarvam-key').value);
    location.reload();
};

init();

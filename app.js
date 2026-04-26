/**
 * Soul-Sync 2026 — Optimized Core
 * Fixes: Gemini REST JSON Schema, Sarvam v3 Payload, Browser Accessibility
 */

const PERSONALITY_DATA = {
    "INTP": { title: "The Architect", desc: "Logical, independent, values deep intellectual connection.", husband: "The 'Space-Giver'.", compatibility: ["INFJ", "ENFJ"] },
    "INTJ": { title: "The Mastermind", desc: "Strategic, private, fiercely ambitious.", husband: "The 'Visionary Partner'.", compatibility: ["ENFP", "ENTP"] },
    "INFJ": { title: "The Advocate", desc: "Insightful, principled, deeply empathetic.", husband: "The 'Devoted Partner'.", compatibility: ["ENTP", "ENFP"] },
    "ENFP": { title: "The Campaigner", desc: "Creative, enthusiastic, sees life as full of possibilities.", husband: "The 'Free Spirit'.", compatibility: ["INTJ", "INFJ"] }
};

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    history: [],
    isRecording: false,
    userGender: localStorage.getItem('user_gender') || 'male',
    keys: { gemini: localStorage.getItem('gemini_key') || '', sarvam: localStorage.getItem('sarvam_key') || '' }
};

const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const typeEl = document.getElementById('mbti-type');
const descEl = document.getElementById('mbti-desc');
const traitsEl = document.getElementById('traits-list');
const mediaCard = document.getElementById('media-card');
const mediaContent = document.getElementById('media-content');
const settingsModal = document.getElementById('settings-modal');

// ─── INIT & UI ───
function init() {
    if (!state.keys.gemini || !state.keys.sarvam) {
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        updateUI();
    }

    document.getElementById('gender-toggle').onclick = () => {
        state.userGender = state.userGender === 'male' ? 'female' : 'male';
        localStorage.setItem('user_gender', state.userGender);
        document.getElementById('gender-label').textContent = state.userGender === 'male' ? '👨 Male' : '👩 Female';
    };
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Keep talking...", husband: "...", compatibility: [] };
    typeEl.textContent = state.mbti;
    descEl.textContent = data.desc;
    if (traitsEl) {
        traitsEl.innerHTML = `
            <div class="label" style="margin-top:15px;">Partner Profile</div>
            <p style="font-size:0.9rem; color:var(--text-dim);">${data.husband}</p>
            <div class="label" style="margin-top:10px;">Best Match</div>
            <p style="color:var(--accent); font-weight:600;">${data.compatibility.join(' · ')}</p>
            <button onclick="localStorage.clear(); location.reload();" style="margin-top:15px; background:none; border:1px solid var(--text-dim); color:var(--text-dim); cursor:pointer; font-size:0.7rem; border-radius:8px; padding:4px 10px;">Reset Keys</button>
        `;
    }
}

document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    const gKey = document.getElementById('gemini-key').value.trim();
    const sKey = document.getElementById('sarvam-key').value.trim();
    if (!gKey || !sKey) return alert("Keys required");
    localStorage.setItem('gemini_key', gKey);
    localStorage.setItem('sarvam_key', sKey);
    location.reload();
};

// ─── VOICE LOGIC ───
let mediaRecorder, audioChunks = [];
voiceBtn.onclick = () => state.isRecording ? stopRecording() : startRecording();

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => processAudio(new Blob(audioChunks, { type: 'audio/webm' }));
    mediaRecorder.start();
    state.isRecording = true;
    voiceBtn.classList.add('recording');
    transcriptEl.textContent = "🎙️ Listening...";
}

function stopRecording() {
    mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    transcriptEl.textContent = "⏳ Processing...";
}

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'mr-IN');

    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': state.keys.sarvam },
        body: formData
    });
    const data = await res.json();
    if (data.transcript) {
        transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> ${data.transcript}`;
        getFriendResponse(data.transcript);
    }
}

// ─── AI BRAIN ───
const GEMINI_MODELS = ["v1/models/gemini-1.5-flash", "v1beta/models/gemini-1.5-flash"];

async function callGemini(contents, systemInstruction) {
    const body = { 
        contents,
        system_instruction: { parts: [{ text: systemInstruction }] } // Fixed snake_case
    };
    
    for (const modelPath of GEMINI_MODELS) {
        const res = await fetch(`https://generativelanguage.googleapis.com/${modelPath}:generateContent?key=${state.keys.gemini}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.candidates) return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Gemini Connection Failed");
}

async function getFriendResponse(userText) {
    const systemPrompt = `You are Soul-Sync, a friend from Thane. Sunday, April 26, 2026. 41°C. 
    Return ONLY JSON: {"reply": "text", "mbti": "TYPE", "media": {"title": "x", "info": "y"}}`;

    const contents = [...state.history, { role: "user", parts: [{ text: userText }] }];

    try {
        const raw = await callGemini(contents, systemPrompt);
        const cleanJson = raw.match(/\{[\s\S]*\}/)[0].replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        const result = JSON.parse(cleanJson);

        state.history.push({ role: "user", parts: [{ text: userText }] });
        state.history.push({ role: "model", parts: [{ text: result.reply }] });

        if (result.mbti !== "Analyzing") { state.mbti = result.mbti; localStorage.setItem('user_mbti', state.mbti); updateUI(); }
        
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${result.reply}`;
        speak(result.reply);
    } catch (e) { transcriptEl.textContent = "Error connecting to brain."; }
}

// ─── VOICE OUTPUT ───
async function speak(text) {
    window.speechSynthesis.cancel();
    if (/[\u0900-\u097F]/.test(text)) {
        const speaker = state.userGender === 'male' ? 'simran' : 'shubh';
        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: [text], target_language_code: 'mr-IN', speaker, model: 'bulbul:v3' })
        });
        const data = await res.json();
        if (data.audios) {
            const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`);
            audio.play();
        }
    } else {
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'en-IN';
        window.speechSynthesis.speak(ut);
    }
}

init();

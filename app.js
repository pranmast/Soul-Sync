/**
 * Soul-Sync 2026 — Final Stability Patch
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
const settingsModal = document.getElementById('settings-modal');

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
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(audioChunks, { type: 'audio/webm' }));
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "🎙️ Listening...";
    } catch (e) { alert("Mic error: " + e.message); }
}

function stopRecording() {
    if (mediaRecorder) mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    transcriptEl.textContent = "⏳ Processing...";
}

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'mr-IN');

    try {
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam },
            body: formData
        });
        const data = await res.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> ${data.transcript}`;
            getFriendResponse(data.transcript);
        } else {
            transcriptEl.textContent = "Didn't catch that.";
        }
    } catch (e) { transcriptEl.textContent = "Sarvam STT Error."; }
}

// ─── AI BRAIN (Fixed Schema) ───
async function callGemini(contents, systemInstruction) {
    // Standardizing on v1beta for better system_instruction support
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.keys.gemini}`;
    
    const body = { 
        contents: contents,
        systemInstruction: { // camelCase for v1beta
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
        }
    };
    
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
        console.error("Gemini Details:", data);
        throw new Error(data.error?.message || "API Error");
    }
    return data.candidates[0].content.parts[0].text;
}

async function getFriendResponse(userText) {
    if (!userText.trim()) return;

    const systemPrompt = `You are Soul-Sync, a friend from Thane. 
    Language: Match the user (Marathi/Hindi/English).
    Output: JSON only. Format: {"reply": "...", "mbti": "...", "media": {"title": "...", "info": "..."}}`;

    // Ensure state.history is valid and role is always 'user' or 'model'
    const validHistory = state.history.filter(h => h.parts && h.parts[0].text);
    const contents = [...validHistory, { role: "user", parts: [{ text: userText }] }];

    try {
        const raw = await callGemini(contents, systemPrompt);
        const result = JSON.parse(raw);

        // Update History
        state.history.push({ role: "user", parts: [{ text: userText }] });
        state.history.push({ role: "model", parts: [{ text: result.reply }] });

        // Update MBTI
        if (result.mbti && result.mbti !== "Analyzing") {
            state.mbti = result.mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }
        
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${result.reply}`;
        speak(result.reply);
    } catch (e) { 
        console.error("Brain Error:", e);
        transcriptEl.textContent = "Check your Gemini API key permissions."; 
    }
}

// ─── VOICE OUTPUT ───
async function speak(text) {
    window.speechSynthesis.cancel();
    const isDevanagari = /[\u0900-\u097F]/.test(text);
    
    if (isDevanagari) {
        const speaker = state.userGender === 'male' ? 'simran' : 'shubh';
        try {
            const res = await fetch('https://api.sarvam.ai/text-to-speech', {
                method: 'POST',
                headers: { 'api-subscription-key': state.keys.sarvam, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    inputs: [text], 
                    target_language_code: 'mr-IN', 
                    speaker: speaker, 
                    model: 'bulbul:v3' 
                })
            });
            const data = await res.json();
            if (data.audios) {
                const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`);
                audio.play();
            }
        } catch (e) { speakEnglish(text); }
    } else {
        speakEnglish(text);
    }
}

function speakEnglish(text) {
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = 'en-IN';
    window.speechSynthesis.speak(ut);
}

init();

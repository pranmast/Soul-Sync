/**
 * Soul-Sync 2026 Edition
 * STT: Sarvam AI (saaras:v3)
 * LLM: Gemini 3.1 Flash (Free Tier)
 */

// 1. MBTI and Partnership Traits Data
const PERSONALITY_DATA = {
    "INTP": {
        title: "The Architect",
        desc: "Logical, independent, and non-conformist. You value deep intellectual connection.",
        husband: "As a husband, you are the 'Space-Giver'. You don't demand traditional roles and solve problems with logic rather than emotion.",
        wife: "As a wife, you are 'The Independent Partner'. You value your own projects and need a partner who respects a quiet, focused house.",
        compatibility: ["INFJ", "ENFJ", "ENTP"]
    },
    "INTJ": {
        title: "The Mastermind",
        desc: "Strategic, private, and fiercely ambitious. You see the world as a chess board.",
        husband: "The 'Visionary Partner'. You aren't interested in trivial talk. You lead the family with long-term strategy and security.",
        wife: "The 'Independent Thinker'. You value efficiency and intellectual competence. You are a low-maintenance but high-loyalty partner.",
        compatibility: ["ENFP", "ENTP", "INFJ"]
    },
    "INFP": {
        title: "The Mediator",
        desc: "Poetic, kind, and altruistic. You seek a soul-deep connection.",
        husband: "The 'Gentle Soul'. You are non-judgmental and supportive of your partner's wildest dreams, bringing idealism to the marriage.",
        wife: "The 'Dreamer Wife'. You create a warm, creative home environment where emotions are valued over rules.",
        compatibility: ["ENFJ", "ENTJ", "INFJ"]
    },
    "ENTP": {
        title: "The Debater",
        desc: "Quick-witted, expressive, and loves a challenge. You keep life interesting.",
        husband: "The 'Idea Generator'. Life with you is never boring. You challenge your partner to grow and bring constant adventure.",
        wife: "The 'Playful Intellectual'. You value banter and wit. You need a partner who can keep up with your fast-paced mind.",
        compatibility: ["INFJ", "INTJ", "ENFP"]
    },
    "ENTJ": {
        title: "The Commander",
        desc: "Decisive, efficient, and natural-born leaders.",
        husband: "The 'Reliable Leader'. You take charge of the family's success. You are the ultimate provider and protector.",
        wife: "The 'Power Partner'. You manage the household and career with precision. You value a partner who is your equal in ambition.",
        compatibility: ["INFP", "INTP", "ENFP"]
    },
    "ENFJ": {
        title: "The Protagonist",
        desc: "Warm, empathetic, and organized. You are a natural leader in relationships.",
        husband: "The 'Guardian of Harmony'. You are deeply attentive to emotional needs and work tirelessly for family happiness.",
        wife: "The 'Emotional Anchor'. You bring people together and ensure everyone feels seen and loved.",
        compatibility: ["INFP", "ISFP", "INTP"]
    }
};

// 2. State Management
let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    transcript: '',
    isRecording: false,
    history: [], 
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
const settingsModal = document.getElementById('settings-modal');

// 4. Initialize
function init() {
    console.log("Initializing Soul-Sync 2026...");
    if (!state.keys.gemini || !state.keys.sarvam || state.keys.gemini === '00') {
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        updateUI();
    }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || PERSONALITY_DATA["INTP"];
    typeEl.textContent = state.mbti;
    descEl.textContent = data.desc;
    
    traitsEl.innerHTML = `
        <div class="subtitle" style="color: var(--accent); margin-bottom: 10px;">Husband Qualities:</div>
        <p>${data.husband}</p>
        <div class="subtitle" style="color: var(--secondary); margin-top: 15px; margin-bottom: 10px;">Ideal Match:</div>
        <p>${data.compatibility.join(', ')}</p>
        <button id="reset-keys-btn" style="margin-top:20px; background:none; border:1px solid var(--text-dim); color:var(--text-dim); padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.7rem;">Reset Keys</button>
    `;

    document.getElementById('reset-keys-btn').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });
}

// 5. Settings Save
const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const gKey = document.getElementById('gemini-key').value.trim();
        const sKey = document.getElementById('sarvam-key').value.trim();
        
        if (gKey && sKey) {
            localStorage.setItem('gemini_key', gKey);
            localStorage.setItem('sarvam_key', sKey);
            state.keys.gemini = gKey;
            state.keys.sarvam = sKey;
            settingsModal.classList.add('hidden');
            updateUI();
            alert("Settings Saved!");
        }
    });
}

// 6. Voice Processing
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

let mediaRecorder;
let audioChunks = [];

voiceBtn.addEventListener('click', async () => {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

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
        transcriptEl.textContent = "Listening...";
    } catch (err) {
        alert("Microphone access denied.");
    }
}

function stopRecording() {
    mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    transcriptEl.textContent = "Processing audio...";
}

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3'); 
    formData.append('language_code', 'mr-IN'); 

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
            analyzePersonality();
        }
    } catch (err) {
        transcriptEl.textContent = "STT Error. Check Sarvam key.";
    }
}

// 7. Core Analysis Logic (The 2026 Fix)
async function analyzePersonality() {
    transcriptEl.textContent = "Soul-Sync is analyzing...";
    
    // Using the 2026 stable alias to avoid 404s
    const MODEL_ID = "gemini-flash-latest"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${state.keys.gemini}`;

    const prompt = `You are Soul-Sync AI, a specialist in psychological theory. 
    Analyze history: ${JSON.stringify(state.history)}. 
    Respond warmly with psychological depth, then ask ONE follow-up question.
    REQUIRED JSON FORMAT: {"response": "...", "next_question": "...", "detected_mbti": "XXXX or Analyzing"}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 429) throw new Error("Rate limit hit (15 req/min). Wait 30s.");
            throw new Error(data.error?.message || "Gemini Error");
        }

        const rawText = data.candidates[0].content.parts[0].text;
        // Extract JSON block even if AI adds markdown or prose
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid response format from AI.");
        
        const result = JSON.parse(jsonMatch[0]);

        if (result.detected_mbti && result.detected_mbti !== "Analyzing") {
            state.mbti = result.detected_mbti;
            localStorage.setItem('user_mbti', result.detected_mbti);
            updateUI();
        }

        const fullText = `${result.response} ${result.next_question}`;
        transcriptEl.innerHTML = `<strong>Soul-Sync:</strong> ${fullText}`;
        state.history.push({ role: "assistant", content: fullText });
        speak(fullText);

    } catch (err) {
        console.error(err);
        transcriptEl.textContent = `Error: ${err.message}`;
    }
}

init();

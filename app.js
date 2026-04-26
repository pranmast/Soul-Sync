/**
 * Soul-Sync: MBTI & Partnership Analysis
 * Core Logic: Sarvam AI (STT) + Google Gemini 1.5 Flash (Analysis)
 */

// 1. MBTI and Partnership Traits Data
const PERSONALITY_DATA = {
    "INTP": {
        title: "The Architect",
        desc: "Logical, independent, and non-conformist. You value deep intellectual connection.",
        husband: "As a husband, you are the 'Space-Giver'. You don't demand traditional roles and respect autonomy. You solve problems with logic rather than emotion.",
        wife: "As a wife, you are 'The Independent Partner'. You value your own projects and need a partner who respects a quiet, focused house.",
        compatibility: ["INFJ", "ENFJ", "ENTP"]
    },
    "INTJ": {
        title: "The Mastermind",
        desc: "Strategic, private, and fiercely ambitious. You see the world as a chess board.",
        husband: "The 'Visionary Partner'. You provide deep security through foresight and long-term family strategy.",
        wife: "The 'Independent Thinker'. You value efficiency and intellectual competence. You are a low-maintenance but high-loyalty partner.",
        compatibility: ["ENFP", "ENTP", "INFJ"]
    },
    "INFP": {
        title: "The Mediator",
        desc: "Poetic, kind, and altruistic. You seek a soul-deep connection.",
        husband: "The 'Gentle Soul'. You are non-judgmental and supportive, bringing idealism and magic to the marriage.",
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
        wife: "The 'Power Partner'. You manage the household and career with precision, seeking an equal in ambition.",
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

// 4. Initialization Logic
function init() {
    console.log("Initializing Soul-Sync...");
    if (!state.keys.gemini || state.keys.gemini === '00' || !state.keys.sarvam || state.keys.sarvam === '00') {
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        updateUI();
    }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || {
        title: "Analyzing...",
        desc: "Speak to Soul-Sync to uncover your traits.",
        husband: "Awaiting analysis.",
        compatibility: ["Searching..."]
    };
    
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

// 5. Settings Handler
const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let gKey = document.getElementById('gemini-key').value.trim();
        let sKey = document.getElementById('sarvam-key').value.trim();
        
        if (gKey.startsWith('sk_') || sKey.startsWith('AIza')) {
            alert("⚠️ Detected Swapped Keys! Please check and swap them.");
            return;
        }

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

// 6. Voice & Audio Processing
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
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            processAudio(audioBlob);
        };
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "Listening...";
    } catch (err) {
        alert("Microphone required for analysis.");
    }
}

function stopRecording() {
    if (mediaRecorder && state.isRecording) {
        mediaRecorder.stop();
        state.isRecording = false;
        voiceBtn.classList.remove('recording');
        transcriptEl.textContent = "Transcribing voice...";
    }
}

async function processAudio(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3'); 
    formData.append('language_code', 'mr-IN'); // Supports Marathi/English mix

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
        transcriptEl.textContent = "Transcription error. Please check Sarvam key.";
    }
}

// 7. Gemini Personality Analysis (Free Tier Flash)
async function analyzePersonality() {
    transcriptEl.textContent = "Soul-Sync is analyzing your psyche...";
    
    const prompt = `You are Soul-Sync AI, an expert in psychological type theory and MBTI.
    Analyze the user's personality based on this history: ${JSON.stringify(state.history)}.
    
    Task: Respond warmly, provide a brief insight into their traits, and ask ONE follow-up question to refine the MBTI.
    Constraint: Return ONLY a raw JSON object with these keys: "response", "next_question", "detected_mbti".
    Format: {"response": "...", "next_question": "...", "detected_mbti": "XXXX or Analyzing"}`;

    // Targeting Gemini 1.5 Flash Free Tier
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.keys.gemini}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (response.status === 429) {
            transcriptEl.textContent = "Rate limit reached (15/min). Please wait 30 seconds.";
            return;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

        // Robust parsing to strip potential markdown code blocks
        let rawText = data.candidates[0].content.parts[0].text;
        let cleanJson = rawText.replace(/```json|```/gi, '').trim();
        const result = JSON.parse(cleanJson);

        if (result.detected_mbti && result.detected_mbti !== "Analyzing") {
            state.mbti = result.detected_mbti;
            localStorage.setItem('user_mbti', result.detected_mbti);
            updateUI();
        }

        const fullResponse = `${result.response} ${result.next_question}`;
        transcriptEl.innerHTML = `<strong>Soul-Sync:</strong> ${fullResponse}`;
        state.history.push({ role: "assistant", content: fullResponse });
        speak(fullResponse);

    } catch (err) {
        console.error(err);
        transcriptEl.textContent = `Analysis failed: ${err.message}`;
    }
}

init();

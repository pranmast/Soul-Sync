// MBTI and Partnership Traits Data
const PERSONALITY_DATA = {
    "INTP": {
        title: "The Architect",
        desc: "Logical, independent, and non-conformist. You value deep intellectual connection.",
        husband: "As a husband, you are the 'Space-Giver'. You don't demand traditional roles and respect your wife's autonomy. You solve problems with logic rather than emotion.",
        wife: "As a wife, you are 'The Independent Partner'. You value your own projects and need a husband who doesn't mind a quiet, focused house.",
        compatibility: ["INFJ", "ENFJ", "ENTP"]
    },
    "INTJ": {
        title: "The Mastermind",
        desc: "Strategic, private, and fiercely ambitious. You see the world as a chess board.",
        husband: "The 'Visionary Partner'. You aren't interested in trivial small talk. You lead the family with long-term strategy and provide deep security through foresight.",
        wife: "The 'Independent Thinker'. You value efficiency and intellectual competence. You are a low-maintenance but high-loyalty partner.",
        compatibility: ["ENFP", "ENTP", "INFJ"]
    },
    "INFP": {
        title: "The Mediator",
        desc: "Poetic, kind, and altruistic. You seek a soul-deep connection.",
        husband: "The 'Gentle Soul'. You are non-judgmental and supportive of your wife's wildest dreams. You bring magic and idealism to the marriage.",
        wife: "The 'Dreamer Wife'. You create a warm, creative home environment where emotions are valued over rules.",
        compatibility: ["ENFJ", "ENTJ", "INFJ"]
    },
    "ENTP": {
        title: "The Debater",
        desc: "Quick-witted, expressive, and loves a challenge. You keep life interesting.",
        husband: "The 'Idea Generator'. Life with you is never boring. You challenge your wife to grow and constantly bring new adventures to the table.",
        wife: "The 'Playful Intellectual'. You value banter and wit. You need a partner who can keep up with your fast-paced mind.",
        compatibility: ["INFJ", "INTJ", "ENFP"]
    },
    "ENTJ": {
        title: "The Commander",
        desc: "Decisive, efficient, and natural-born leaders.",
        husband: "The 'Reliable Leader'. You take charge of the family's success. You are the ultimate provider and protector, focusing on excellence.",
        wife: "The 'Power Partner'. You manage the household and career with precision. You value a husband who is your equal in ambition.",
        compatibility: ["INFP", "INTP", "ENFP"]
    },
    "ENFJ": {
        title: "The Protagonist",
        desc: "Warm, empathetic, and organized. You are a natural leader in relationships.",
        husband: "The 'Guardian of Harmony'. You are deeply attentive to your wife's emotional needs and will work tirelessly for family happiness.",
        wife: "The 'Emotional Anchor'. You bring people together and ensure everyone feels seen and loved.",
        compatibility: ["INFP", "ISFP", "INTP"]
    },
    // Add more types as needed...
};
// State Management
let state = {
    mbti: localStorage.getItem('user_mbti') || 'INTP',
    transcript: '',
    isRecording: false,
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};
// UI Elements
const voiceBtn = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const typeEl = document.getElementById('mbti-type');
const descEl = document.getElementById('mbti-desc');
const traitsEl = document.getElementById('traits-list');
const settingsModal = document.getElementById('settings-modal');
// Initialize
function init() {
    console.log("Initializing Soul-Sync...");
    // If keys are missing OR are placeholders, show modal
    if (!state.keys.gemini || state.keys.gemini === '00' || !state.keys.sarvam || state.keys.sarvam === '00') {
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        updateUI();
    }
}
// Update UI based on MBTI
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
    // Add reset listener
    document.getElementById('reset-keys-btn').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });
}
// Save Settings
const saveBtn = document.getElementById('save-settings');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const gKey = document.getElementById('gemini-key').value.trim();
        const sKey = document.getElementById('sarvam-key').value.trim();
        
        if (gKey && sKey) {
            console.log("Saving keys to localStorage...");
            localStorage.setItem('gemini_key', gKey);
            localStorage.setItem('sarvam_key', sKey);
            state.keys.gemini = gKey;
            state.keys.sarvam = sKey;
            settingsModal.classList.add('hidden');
            updateUI();
            alert("Settings Saved! You can now start the assessment.");
        } else {
            alert("Please provide both keys.");
        }
    });
}
// Voice Interaction Logic
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
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Chrome records in webm
            processAudio(audioBlob);
        };
        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "Listening to your soul...";
    } catch (err) {
        console.error("Microphone access denied", err);
        alert("Microphone access is required for the personality test.");
    }
}
function stopRecording() {
    mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    transcriptEl.textContent = "Processing your energy...";
}
// API: Sarvam AI (Speech to Text)
async function processAudio(blob) {
    const formData = new FormData();
    // Use 'audio.webm' as the filename since that is the real format
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3'); 
    formData.append('language_code', 'mr-IN'); // Optimized for Marathi and English
    try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: {
                'api-subscription-key': state.keys.sarvam
            },
            body: formData
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Sarvam API Error Body:", errorBody);
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }
        const data = await response.json();
        if (data.transcript) {
            transcriptEl.textContent = `"${data.transcript}"`;
            analyzePersonality(data.transcript);
        }
    } catch (err) {
        console.error("Sarvam API Error", err);
        transcriptEl.textContent = "Error: Check your keys or speak longer.";
    }
}
// API: Gemini (Personality Analysis)
async function analyzePersonality(text) {
    const prompt = `Based on this spoken text: "${text}", evaluate the user's personality traits. 
    Map them to one of the 16 MBTI types (INTJ, INTP, etc.). 
    Return ONLY the 4-letter code. If unsure, return the most likely one based on the vibe.`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.keys.gemini}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text.trim().toUpperCase();
        
        if (result.length === 4) {
            state.mbti = result;
            localStorage.setItem('user_mbti', result);
            updateUI();
        }
    } catch (err) {
        console.error("Gemini API Error", err);
    }
}
// Run init on load
init();

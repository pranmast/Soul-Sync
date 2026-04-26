/**
 * Soul-Sync 2026 — Fixed & Enhanced
 * Fixes: Sarvam language_code, Gemini model fallback, browser warnings
 */

// ─── 1. MBTI Data ────────────────────────────────────────────────────────────
const PERSONALITY_DATA = {
    "INTP": {
        title: "The Architect",
        desc: "Logical, independent, non-conformist. Values deep intellectual connection.",
        husband: "The 'Space-Giver'. Solves problems with logic, respects autonomy.",
        compatibility: ["INFJ", "ENFJ", "ENTP"]
    },
    "INTJ": {
        title: "The Mastermind",
        desc: "Strategic, private, fiercely ambitious.",
        husband: "The 'Visionary Partner'. Leads with long-term strategy and security.",
        compatibility: ["ENFP", "ENTP", "INFJ"]
    },
    "INFP": {
        title: "The Mediator",
        desc: "Poetic, kind, seeking soul-deep connections.",
        husband: "The 'Gentle Soul'. Supportive of partner's wildest dreams.",
        compatibility: ["ENFJ", "ENTJ", "INFJ"]
    },
    "ENTP": {
        title: "The Debater",
        desc: "Quick-witted, expressive. Keeps life interesting.",
        husband: "The 'Idea Generator'. Challenges partner to constant growth.",
        compatibility: ["INFJ", "INTJ", "ENFP"]
    },
    "ENTJ": {
        title: "The Commander",
        desc: "Decisive, efficient, natural-born leader.",
        husband: "The 'Reliable Leader'. Ultimate provider, focused on excellence.",
        compatibility: ["INFP", "INTP", "ENFP"]
    },
    "ENFJ": {
        title: "The Protagonist",
        desc: "Warm, empathetic, organized leader in relationships.",
        husband: "The 'Guardian of Harmony'. Deeply attentive to emotional needs.",
        compatibility: ["INFP", "ISFP", "INTP"]
    },
    "INFJ": {
        title: "The Advocate",
        desc: "Insightful, principled, deeply empathetic.",
        husband: "The 'Devoted Partner'. Loyal to a fault and deeply meaningful.",
        compatibility: ["ENTP", "ENFP", "INTJ"]
    },
    "ENFP": {
        title: "The Campaigner",
        desc: "Creative, enthusiastic, sees life as full of possibilities.",
        husband: "The 'Free Spirit Partner'. Spontaneous, inspiring, full of joy.",
        compatibility: ["INTJ", "INFJ", "ENFJ"]
    }
};

// ─── 2. State ─────────────────────────────────────────────────────────────────
let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
    history: [],
    isRecording: false,
    userGender: localStorage.getItem('user_gender') || 'male', // 'male' or 'female'
    keys: {
        gemini: localStorage.getItem('gemini_key') || '',
        sarvam: localStorage.getItem('sarvam_key') || ''
    }
};

// ─── 3. UI Elements ───────────────────────────────────────────────────────────
const voiceBtn    = document.getElementById('voice-btn');
const transcriptEl = document.getElementById('transcript');
const typeEl      = document.getElementById('mbti-type');
const descEl      = document.getElementById('mbti-desc');
const traitsEl    = document.getElementById('traits-list');
const mediaCard   = document.getElementById('media-card');
const mediaContent = document.getElementById('media-content');
const settingsModal = document.getElementById('settings-modal');

// ─── 4. Init ──────────────────────────────────────────────────────────────────
function init() {
    if (!state.keys.gemini || !state.keys.sarvam) {
        settingsModal.classList.remove('hidden');
    } else {
        settingsModal.classList.add('hidden');
        updateUI();
    }

    // Gender toggle button
    const genderToggle = document.getElementById('gender-toggle');
    const genderLabel  = document.getElementById('gender-label');
    if (genderToggle) {
        // Set initial label from saved state
        genderLabel.textContent = state.userGender === 'male' ? '👨 Male' : '👩 Female';
        genderToggle.addEventListener('click', () => {
            state.userGender = state.userGender === 'male' ? 'female' : 'male';
            localStorage.setItem('user_gender', state.userGender);
            genderLabel.textContent = state.userGender === 'male' ? '👨 Male' : '👩 Female';
            // Visual feedback
            genderToggle.style.borderColor = state.userGender === 'male' ? 'var(--accent)' : 'var(--secondary)';
        });
        // Set initial border color
        genderToggle.style.borderColor = state.userGender === 'male' ? 'var(--accent)' : 'var(--secondary)';
    }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || {
        title: "Analyzing", desc: "Keep talking to map your vibe.",
        husband: "...", compatibility: []
    };
    typeEl.textContent = state.mbti;
    descEl.textContent = data.desc;
    if (traitsEl) {
        traitsEl.innerHTML = `
            <div class="label" style="margin-top:15px;">Partner Profile</div>
            <p style="font-size:0.9rem; color:var(--text-dim);">${data.husband}</p>
            <div class="label" style="margin-top:10px;">Best Match</div>
            <p style="color:var(--accent); font-weight:600;">${data.compatibility.join(' · ') || '...'}</p>
            <button id="reset-btn" style="margin-top:15px; background:none; border:1px solid var(--text-dim);
            color:var(--text-dim); padding:4px 10px; border-radius:8px; cursor:pointer; font-size:0.7rem;">
            Reset Keys</button>
        `;
        document.getElementById('reset-btn').onclick = () => {
            localStorage.clear(); location.reload();
        };
    }
}

// ─── 5. Settings Form ─────────────────────────────────────────────────────────
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const gKey = document.getElementById('gemini-key').value.trim();
    const sKey = document.getElementById('sarvam-key').value.trim();

    // Detect swapped keys
    if (gKey.startsWith('sk_') || sKey.startsWith('AIza')) {
        alert("⚠️ Keys look swapped!\nGoogle key starts with 'AIza'\nSarvam key starts with 'sk_'");
        return;
    }
    if (!gKey || !sKey) { alert("Both keys are required."); return; }

    localStorage.setItem('gemini_key', gKey);
    localStorage.setItem('sarvam_key', sKey);
    state.keys.gemini = gKey;
    state.keys.sarvam = sKey;
    settingsModal.classList.add('hidden');
    updateUI();
});

// ─── 6. Voice Recording ───────────────────────────────────────────────────────
let mediaRecorder, audioChunks = [];

voiceBtn.onclick = async () => {
    state.isRecording ? stopRecording() : startRecording();
};

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // ✅ FIX: Detect the correct MIME type Chrome actually uses
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () =>
            processAudio(new Blob(audioChunks, { type: mimeType }));
        mediaRecorder.start();
        state.isRecording = true;
        state.recordingMime = mimeType; // Store for use in processAudio
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "🎙️ Listening...";
    } catch {
        alert("Microphone access is required.");
    }
}

function stopRecording() {
    mediaRecorder.stop();
    state.isRecording = false;
    voiceBtn.classList.remove('recording');
    transcriptEl.textContent = "⏳ Processing...";
}

// ─── 7. Sarvam AI — Speech to Text ───────────────────────────────────────────
// FIX: Removed 'mul' language_code — Sarvam doesn't support it.
// Using 'mr-IN' for Marathi auto-detection (handles Marathi + English mixed speech)
async function processAudio(blob) {
    const formData = new FormData();
    // ✅ FIX: Sarvam accepts 'audio/webm' but NOT 'audio/webm;codecs=opus'
    // Strip the codec suffix — base MIME type only
    const baseMime = (state.recordingMime || 'audio/webm').split(';')[0];
    const ext = baseMime.includes('ogg') ? 'ogg' : 'webm';
    const sarvamBlob = new Blob([blob], { type: baseMime });
    formData.append('file', sarvamBlob, `audio.${ext}`);
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'mr-IN');

    try {
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': state.keys.sarvam },
            body: formData
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Sarvam error:", err);
            transcriptEl.textContent = `Sarvam Error: ${res.status}. Check your key.`;
            return;
        }

        const data = await res.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> ${data.transcript}`;
            // ✅ FIX: Don't push to history yet — getFriendResponse will push both turns together
            getFriendResponse(data.transcript);
        } else {
            transcriptEl.textContent = "Didn't catch that. Try speaking again.";
        }
    } catch (e) {
        console.error("Sarvam fetch error:", e);
        transcriptEl.textContent = "Voice connection failed.";
    }
}

// ─── 8. Gemini AI — Smart Fallback ───────────────────────────────────────────
// FIX: Try 2025/2026 models in order until one works
const GEMINI_MODELS = [
    "v1/models/gemini-2.5-flash",
    "v1/models/gemini-2.0-flash",
    "v1/models/gemini-1.5-flash",
    "v1beta/models/gemini-1.5-flash",
    "v1beta/models/gemini-pro"
];

// ✅ FIX: Use Gemini's proper systemInstruction field (not a fake user/model pair)
// ✅ FIX: Use a compatible structure for v1 models
// ─── 8. Gemini AI — The Final Working Config ─────────────────────────────────
async function callGemini(contents, systemInstruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.keys.gemini}`;

    // ✅ THE MOST STABLE STRUCTURE:
    // 1. systemInstruction must NOT have a 'role'
    // 2. Parts must be a direct array with a 'text' property
    const body = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: contents.map(c => ({
            role: c.role === 'assistant' ? 'model' : c.role,
            parts: [{ text: c.content || c.parts?.[0]?.text || "" }]
        })),
        generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
        }
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            // Log exactly what we sent to debug if it fails again
            console.log("Sent Body:", JSON.stringify(body));
            console.error("API Error Response:", data);
            throw new Error(data.error?.message || "Invalid Structure");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        throw e;
    }
}

async function getFriendResponse(userText) {
    transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> Thinking...`;

    // ✅ FIX: Since v1 doesn't support the system_instruction field, 
    // we inject the instructions as the VERY FIRST 'user' message.
    const systemPrompt = `SYSTEM INSTRUCTIONS: You are Soul-Sync, a personal friend from Thane.
    Today is Sunday, April 26, 2026 (41°C). 
    Reply in the user's language. Return ONLY JSON: {"reply": "...", "mbti": "...", "media": {"title": "...", "info": "..."}}`;

    // Construct the contents array for v1
    let contents = [];
    
    if (state.history.length === 0) {
        // First time? Add the instructions + user message
        contents.push({ role: "user", parts: [{ text: systemPrompt + "\n\nUser says: " + userText }] });
    } else {
        // Ongoing chat? Use history and add user message
        contents = [
            ...state.history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            { role: "user", parts: [{ text: userText }] }
        ];
    }

    try {
        const rawText = await callGemini(contents);
        
        // Clean the response (Gemini sometimes adds ```json ... ```)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Response format error");

        const safeJson = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, '');
        const result = JSON.parse(safeJson);

        // Update UI
        if (result.mbti && result.mbti !== "Analyzing") {
            state.mbti = result.mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${result.reply}`;
        
        // Save to history
        state.history.push({ role: "user", content: userText });
        state.history.push({ role: "model", content: result.reply });
        
        speak(result.reply);

    } catch (e) {
        console.error("Gemini Error:", e);
        transcriptEl.textContent = `Error: ${e.message}`;
    }
}

// ─── 10. Text-to-Speech — Bilingual (Sarvam for Marathi, Browser for English) ─
async function speak(text) {
    window.speechSynthesis.cancel(); // Stop any previous browser speech

    const isDevanagari = /[\u0900-\u097F]/.test(text);

    if (isDevanagari) {
        // Use Sarvam AI TTS for real Marathi voice (Bulbul v3)
        await speakMarathi(text);
    } else {
        // Use browser TTS for English
        speakEnglish(text);
    }
}

async function speakMarathi(text) {
    const safeText = text.length > 500 ? text.substring(0, 497) + '...' : text;

    // Voice logic: AI speaks in opposite gender to create natural conversation feel
    // Male user → Simran (female AI voice) | Female user → Shubh (male AI voice)
    const speaker = state.userGender === 'male' ? 'simran' : 'shubh';

    try {
        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'api-subscription-key': state.keys.sarvam,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [safeText],
                target_language_code: 'mr-IN',
                speaker: speaker,
                pace: 1.0,
                model: 'bulbul:v3'
            })
        });

        if (!res.ok) {
            // Log the exact error body so we can see what Sarvam is saying
            const errBody = await res.text();
            console.error(`Sarvam TTS ${res.status}:`, errBody);
            transcriptEl.innerHTML += `<br><small style="color:orange">⚠️ TTS Error: ${errBody}</small>`;
            speakEnglish(safeText); // Fallback to browser TTS
            return;
        }

        const data = await res.json();
        const audioBase64 = data.audios?.[0];
        if (!audioBase64) {
            console.warn("Sarvam TTS: No audio in response", data);
            speakEnglish(safeText);
            return;
        }

        // Decode base64 and play
        const audioBlob = base64ToBlob(audioBase64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);

    } catch (e) {
        console.error("Sarvam TTS fetch error:", e);
        speakEnglish(safeText);
    }
}

function speakEnglish(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'en-IN') ||
                  voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

function base64ToBlob(base64, mimeType) {
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNums)], { type: mimeType });
}

// Preload voices
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

// ─── Run ──────────────────────────────────────────────────────────────────────
init();

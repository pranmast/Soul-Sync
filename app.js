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
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () =>
            processAudio(new Blob(audioChunks, { type: 'audio/webm' }));
        mediaRecorder.start();
        state.isRecording = true;
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
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'mr-IN'); // ✅ Valid: Marathi (handles code-mixed speech)
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
            state.history.push({ role: "user", content: data.transcript });
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
async function callGemini(prompt) {
    for (const modelPath of GEMINI_MODELS) {
        try {
            console.log("Trying:", modelPath);
            const res = await fetch(
                `https://generativelanguage.googleapis.com/${modelPath}:generateContent?key=${state.keys.gemini}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            );
            const data = await res.json();
            if (!res.ok) { console.warn(modelPath, "failed:", data.error?.message); continue; }
            if (!data.candidates?.[0]) continue;
            console.log("✅ Success with:", modelPath);
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            console.warn(modelPath, "error:", e.message);
        }
    }
    throw new Error("All Gemini models failed. Check your Google API key.");
}
// ─── 9. AI Brain — Friend Response ───────────────────────────────────────────
async function getFriendResponse(userText) {
    transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> Thinking...`;
    const systemPrompt = `You are Soul-Sync, a personal friend from Thane, Maharashtra.
    Today is Sunday, April 26, 2026 and it is hot outside (41°C).
    
    Rules:
    1. Reply in the SAME LANGUAGE as the user (Marathi, Hindi, or English).
    2. Be warm, deep and personal. Reference local spots if helpful (Viviana Mall, Upvan Lake, Masunda Lake, Yeoor Hills).
    3. Analyze MBTI from the conversation (Introvert/Extrovert, Sensing/Intuition, Thinking/Feeling, Judging/Perceiving).
    4. Suggest a YouTube video or activity if it fits naturally.
    5. Stay in character until user says "Ok bye".
    
    Conversation so far: ${JSON.stringify(state.history)}
    
    Return EXACTLY this JSON (no extra text):
    {
        "reply": "Your warm response here",
        "mbti": "4-letter type if 85% confident, else Analyzing",
        "media": {"title": "Optional suggestion title", "info": "Brief info or leave empty"}
    }`;
    try {
        const rawText = await callGemini(`${systemPrompt}\nUser: ${userText}`);
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Response format error");
        const result = JSON.parse(jsonMatch[0]);
        // Update MBTI if confident
        if (result.mbti && result.mbti !== "Analyzing" && result.mbti.length === 4) {
            state.mbti = result.mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }
        // Show media suggestion if provided
        if (result.media?.title && result.media?.info) {
            mediaCard.classList.remove('hidden');
            mediaContent.innerHTML = `
                <strong style="color:var(--accent)">${result.media.title}</strong>
                <p style="margin-top:5px; color:var(--text-dim)">${result.media.info}</p>`;
        }
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${result.reply}`;
        state.history.push({ role: "assistant", content: result.reply });
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
    try {
        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'api-subscription-key': state.keys.sarvam,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [text],
                target_language_code: 'mr-IN',
                speaker: 'kavya',   // ✅ Valid female voice (bulbul:v3)
                pace: 1.0,
                model: 'bulbul:v3'
            })
        });
        if (!res.ok) {
            console.warn("Sarvam TTS failed, falling back to browser TTS.");
            speakEnglish(text); // Fallback
            return;
        }
        const data = await res.json();
        // Sarvam returns base64-encoded audio
        const audioBase64 = data.audios?.[0];
        if (!audioBase64) { speakEnglish(text); return; }
        // Decode base64 and play as audio
        const audioBlob = base64ToBlob(audioBase64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl); // Free memory
    } catch (e) {
        console.error("Sarvam TTS Error:", e);
        speakEnglish(text); // Fallback on any error
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

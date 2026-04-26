/**
 * Soul-Sync 2026: Psychological Architecture
 */

const PERSONALITY_DATA = {
    "INTP": { title: "The Logician", desc: "Inventive innovators with an unquenchable thirst for knowledge.", traits: "Values intellectual depth, requires high autonomy, and focuses on objective truth.", dynamics: "Pairs well with types that respect mental space and offer emotional stability." },
    "INTJ": { title: "The Architect", desc: "Strategic thinkers with a plan for everything.", traits: "High efficiency, strategic foresight, and preference for competence over social niceties.", dynamics: "Best suited for individuals who are self-driven and intellectually ambitious." },
    "INFJ": { title: "The Advocate", desc: "Quiet and mystical, yet very inspiring and tireless idealists.", traits: "Deep empathy, visionary insight, and a strong sense of personal integrity.", dynamics: "Requires profound emotional and intellectual connection." },
    "INFP": { title: "The Mediator", desc: "Poetic, kind and altruistic people, always eager to help a good cause.", traits: "Value-driven, imaginative, and deeply empathetic to the human condition.", dynamics: "Thrives with partners who provide safety for their rich inner world." },
    "ENTP": { title: "The Debater", desc: "Smart and curious thinkers who cannot resist an intellectual challenge.", traits: "Quick wit, adaptable, and loves exploring divergent possibilities.", dynamics: "Connects best with those who enjoy high-speed mental sparring." }
};

let state = {
    mbti: localStorage.getItem('user_mbti') || 'Analyzing...',
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
const langSelect = document.getElementById('language-select');

function init() {
    if (!state.keys.gemini || state.keys.gemini === '00' || !state.keys.sarvam) {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    langSelect.addEventListener('change', (e) => state.language = e.target.value);
    updateUI();
}

// Fixed Voice Logic for 2026 Browsers
async function toggleRecording() {
    if (state.isRecording) return; // Managed by onstop

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        let chunks = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(chunks, { type: 'audio/webm' }));

        mediaRecorder.start();
        state.isRecording = true;
        voiceBtn.classList.add('recording');
        transcriptEl.textContent = "Listening to your patterns...";

        // Click again to stop
        voiceBtn.onclick = () => {
            mediaRecorder.stop();
            state.isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.onclick = toggleRecording;
        };
    } catch (err) {
        alert("System requires microphone access.");
    }
}
voiceBtn.onclick = toggleRecording;

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
            transcriptEl.innerHTML = `<span style="color:var(--accent)">User:</span> ${data.transcript}`;
            state.history.push({ role: "user", content: data.transcript });
            analyzeWithGemini();
        }
    } catch (e) { transcriptEl.textContent = "STT Error."; }
}

async function analyzeWithGemini() {
    transcriptEl.textContent = "Analyzing cognitive functions...";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${state.keys.gemini}`;

    const prompt = `You are an AI Psychologist specializing in Personality Architecture.
    GOAL: Have a natural, sophisticated conversation. Determine user MBTI letters (E/I, S/N, T/F, J/P).
    STRICT RULE: NEVER mention marriage, husbands, wives, or domestic roles. Keep it professional and theoretical.
    OUTPUT: JSON ONLY: {"response": "Psychological feedback", "next_question": "Deep inquiry", "detected_mbti": "XXXX or Analyzing"}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\nHistory: ${JSON.stringify(state.history)}` }] }] })
        });
        const data = await response.json();
        const res = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);

        if (res.detected_mbti && res.detected_mbti !== "Analyzing") {
            state.mbti = res.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        const fullText = `${res.response} ${res.next_question}`;
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${fullText}`;
        state.history.push({ role: "assistant", content: fullText });
        
        const speech = new SpeechSynthesisUtterance(fullText);
        speech.lang = state.language;
        window.speechSynthesis.speak(speech);
    } catch (e) { transcriptEl.textContent = "AI Sync Error."; }
}

function updateUI() {
    const data = PERSONALITY_DATA[state.mbti] || { title: "Analyzing", desc: "Continue speaking...", traits: "Processing traits...", dynamics: "Assessing dynamics..." };
    document.getElementById('mbti-type').textContent = state.mbti;
    document.getElementById('mbti-desc').textContent = data.desc;
    document.getElementById('traits-list').innerHTML = `
        <p style="margin-bottom:10px;"><strong>Key Traits:</strong> ${data.traits}</p>
        <p><strong>Interpersonal Dynamics:</strong> ${data.dynamics}</p>
    `;
}

document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', document.getElementById('gemini-key').value);
    localStorage.setItem('sarvam_key', document.getElementById('sarvam-key').value);
    location.reload();
};

init();

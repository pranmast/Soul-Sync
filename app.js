/**
 * Soul-Sync 2026 Edition (Thane Local Optimized)
 * Bug Fixes: Sarvam v3 Headers & Multilingual Prompting
 */

// ... [Keep PERSONALITY_DATA and state as you have them] ...

// 6. Voice Processing
async function processAudio(blob) {
    const formData = new FormData();
    // Use 'file' key and 'audio.webm' for Sarvam v3
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'saaras:v3'); 
    // 'mul' is better for Thane users who mix Marathi/Hindi/English
    formData.append('language_code', 'mul'); 

    try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 
                'api-subscription-key': state.keys.sarvam 
                // CRITICAL: Do NOT set 'Content-Type' header; browser handles it for FormData
            },
            body: formData
        });
        
        if (!response.ok) throw new Error(`STT Error: ${response.status}`);
        
        const data = await response.json();
        if (data.transcript) {
            transcriptEl.innerHTML = `<span style="color:var(--accent)">You:</span> "${data.transcript}"`;
            state.history.push({ role: "user", content: data.transcript });
            analyzePersonality(data.transcript);
        }
    } catch (err) {
        console.error(err);
        transcriptEl.textContent = "STT Error. Check your connection or Sarvam key.";
    }
}

// 7. Core Analysis Logic (Personality & Thane Context)
async function analyzePersonality(userText) {
    transcriptEl.textContent = "विचार करतोय... (Analyzing)";
    
    const MODEL_ID = "gemini-1.5-flash"; // Stable 2026 endpoint
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${state.keys.gemini}`;

    // Updated system prompt for better friend-vibe and local relevance
    const systemPrompt = `You are Soul-Sync, a chill, insightful friend from Thane. 
    CURRENT CONTEXT: It's April 2026. Thane is currently facing a heat alert (temp around 33°C-41°C). 
    1. Analyze the user's psychology based on history: ${JSON.stringify(state.history)}.
    2. Respond like a local buddy—warm, slightly witty, but deeply psychological.
    3. If relevant, mention local vibes like Upvan Lake, Viviana, or the heatwave.
    4. Provide one YouTube-style media recommendation (e.g., a relaxing song or a recipe like Paneer Butter Masala).
    5. No lists. Just natural chat + ONE follow-up question.
    REQUIRED JSON: {"response": "...", "next_question": "...", "detected_mbti": "XXXX", "media": {"title": "...", "link": "..."}}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${userText}` }] }] })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);

        // Update MBTI UI if detected
        if (result.detected_mbti && result.detected_mbti !== "Analyzing") {
            state.mbti = result.detected_mbti;
            localStorage.setItem('user_mbti', state.mbti);
            updateUI();
        }

        // Display Response
        const fullText = `${result.response} ${result.next_question}`;
        transcriptEl.innerHTML = `<span style="color:var(--secondary)">Soul-Sync:</span> ${fullText}`;
        
        // Bonus: Media Recommendation Card (if you have one in your UI)
        if(result.media) {
             console.log("Recommended:", result.media.title);
        }

        state.history.push({ role: "assistant", content: fullText });
        speak(fullText);

    } catch (err) {
        transcriptEl.textContent = "Connectivity issue with Gemini.";
    }
}

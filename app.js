<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Soul-Sync | AI Companion</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💜</text></svg>">
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header>
            <h1>Soul-Sync AI</h1>
            <p class="subtitle">Personality Architecture & Deep Connection</p>
        </header>

        <main id="dashboard">
            <div class="card profile-card">
                <div class="label">Identity Mapping</div>
                <div class="type-display">
                    <div id="mbti-type" class="mbti-badge">Analyzing...</div>
                    <p id="mbti-desc" class="subtitle">Talk to me to map your vibe.</p>
                </div>
                <div id="traits-list"></div>
            </div>

            <div class="voice-btn-container">
                <button id="voice-btn" class="voice-btn">
                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
                <div class="gender-toggle" id="gender-toggle">
                    <span id="gender-label">👨 Male</span>
                </div>
            </div>

            <div class="card assessment-card">
                <div id="transcript" class="subtitle">"आणि काय म्हणता? बोला, मी ऐकतोय..."</div>
            </div>

            <div id="media-card" class="card hidden">
                <div class="label">Recommended Activity</div>
                <div id="media-content"></div>
            </div>
        </main>

        <div id="settings-modal" class="hidden">
            <div class="card" style="width:90%; max-width:400px;">
                <h2 style="text-align:center; margin-bottom:20px;">System Setup</h2>
                <form id="settings-form" autocomplete="on">
                    <input type="text" name="username" value="SoulSyncUser" style="display:none;" autocomplete="username">
                    <div class="input-group">
                        <label>Gemini API Key</label>
                        <input type="password" id="gemini-key" placeholder="AIza..." autocomplete="current-password">
                    </div>
                    <div class="input-group">
                        <label>Sarvam API Key</label>
                        <input type="password" id="sarvam-key" placeholder="sk_..." autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn-primary">Initialize</button>
                </form>
            </div>
        </div>
    </div>
    <script src="app.js"></script>
</body>
</html>

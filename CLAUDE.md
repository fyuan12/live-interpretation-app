# Live Gospel Interpreter - Project Context for Claude

## Project Overview
A real-time English ↔ Chinese interpretation tool for LDS (Church of Jesus Christ of Latter-day Saints) church meetings. Uses Web Speech API for speech recognition and DeepL for translation with a custom glossary of 150+ LDS terminology terms.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework)
- **Backend**: Node.js + Express (simple proxy server for DeepL API)
- **APIs**: 
  - Web Speech API (Chrome only) for speech-to-text
  - DeepL API Pro for translation with glossary support
- **Styling**: Custom dark theme optimized for projection

## Project Structure
```
live-interpretation-app/
├── index.html      # Main UI with modals for setup and font settings
├── styles.css      # Dark theme, responsive panels, CSS variables
├── app.js          # LiveInterpreter class - main application logic
├── glossary.js     # 150+ LDS terms with EN↔ZH translations
├── server.js       # Express proxy for DeepL API (handles CORS)
├── package.json    # Dependencies: express, cors
└── README.md       # User documentation
```

## Key Features (Completed)
- ✅ Real-time speech-to-text via Chrome Web Speech API
- ✅ DeepL translation with custom LDS glossary
- ✅ Bidirectional: EN→ZH and ZH→EN translation
- ✅ Side-by-side display optimized for projection
- ✅ Adjustable sentence history (3-10 sentences)
- ✅ Font customization (English and Chinese fonts/sizes)
- ✅ Dark theme with professional styling
- ✅ Auto-glossary creation for both directions
- ✅ API key stored in localStorage

## How It Works
1. User enters DeepL API key on first run
2. App creates two DeepL glossaries (EN→ZH and ZH→EN) automatically
3. User clicks "Start Listening" - microphone captures speech
4. Web Speech API transcribes speech to text
5. Text sent to DeepL via Express proxy server
6. Translation displayed alongside original in real-time
7. Sentences scroll with configurable history limit

## Running the App
```bash
cd /Users/franklinyuan/Documents/Claude-Projects/live-interpretation-app
npm install          # Install express and cors
npm start            # Starts server at http://localhost:8000
```
Then open Chrome and navigate to `http://localhost:8000`

## Remaining Tasks

### 1. Deploy the App
Options to consider:
- **Railway/Render/Fly.io**: Free tier, easy Node.js deployment
- **Vercel**: Good for static + serverless, may need to convert proxy to API routes
- **Heroku**: Classic option, but no longer free
- **Self-hosted**: User's own server

Deployment considerations:
- Environment variable for DeepL API key (don't hardcode)
- HTTPS required for Web Speech API in production
- Consider API key input vs. server-side key management

### 2. Create GitHub Repository
```bash
cd /Users/franklinyuan/Documents/Claude-Projects/live-interpretation-app
git init
git add .
git commit -m "Initial commit: Live Gospel Interpreter"
# Then create repo on GitHub and push
```

Files to add to `.gitignore`:
```
node_modules/
.DS_Store
.env
```

## Design Decisions Made
1. **No React/Vue**: Vanilla JS for simplicity and fast loading
2. **Express proxy**: Avoids CORS issues with DeepL API
3. **Dual glossaries**: Separate EN→ZH and ZH→EN for bidirectional translation
4. **Dark theme**: Better for projection in church settings
5. **Google Fonts**: Noto Sans SC, Source Serif 4 for readability
6. **localStorage**: Simple persistence for API key and preferences

## LDS Glossary Notes
- 150+ terms covering: priesthood, ordinances, temple, scriptures, organizations
- Stored in `glossary.js` as array of [English, Chinese] pairs
- DeepL glossary API ensures consistent translation of religious terms
- ZH→EN glossary is deduplicated (some Chinese terms map to multiple English)

## API Costs
- DeepL Pro API: $5.75/month base + ~$0.75-1.25 per 30-40 min session
- Estimated monthly: $10-12 for weekly church use

## Browser Requirements
- **Chrome required**: Web Speech API not available in Firefox/Safari
- Microphone permission needed
- Internet connection required for DeepL API

## Potential Future Enhancements
- [ ] Offline mode with local translation model
- [ ] Recording/export of sessions
- [ ] Multiple language pairs (Spanish, Portuguese, etc.)
- [ ] Confidence indicators for translations
- [ ] Custom glossary editor UI
- [ ] Mobile-responsive layout for tablets

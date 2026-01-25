require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;

// Environment variables
const APP_PASSWORD = process.env.APP_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Validate required environment variables
if (!APP_PASSWORD || !JWT_SECRET || !DEEPL_API_KEY || !DEEPGRAM_API_KEY) {
    console.error('Missing required environment variables. Please check your .env file.');
    console.error('Required: APP_PASSWORD, JWT_SECRET, DEEPL_API_KEY, DEEPGRAM_API_KEY');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    if (password !== APP_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    // Create JWT token (expires in 24 hours)
    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token });
});

// Protected endpoint to get Deepgram API key
app.get('/api/config/deepgram', authenticateToken, (req, res) => {
    res.json({ apiKey: DEEPGRAM_API_KEY });
});

// Get DeepL base URL based on API key type
function getDeepLBaseUrl() {
    return DEEPL_API_KEY.includes(':fx')
        ? 'https://api-free.deepl.com'
        : 'https://api.deepl.com';
}

// Protected proxy endpoint for DeepL API
app.all('/api/deepl/*', authenticateToken, async (req, res) => {
    const deeplPath = req.params[0]; // e.g., "v2/usage" or "v2/translate"
    const baseUrl = getDeepLBaseUrl();
    const url = `${baseUrl}/${deeplPath}`;

    console.log(`[Proxy] ${req.method} ${url}`);
    console.log('[Proxy] Body:', req.body);

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`
            }
        };

        // Add body for POST requests
        if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
            // Always use URL-encoded format for DeepL API
            const formBody = new URLSearchParams();
            for (const [key, value] of Object.entries(req.body)) {
                formBody.append(key, value);
            }
            fetchOptions.body = formBody.toString();
            fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            console.log('[Proxy] Encoded body:', fetchOptions.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.text();

        console.log('[Proxy] Response status:', response.status);
        if (response.status >= 400) {
            console.log('[Proxy] Error response:', data);
        }

        // Forward the response
        res.status(response.status);
        res.set('Content-Type', response.headers.get('content-type') || 'application/json');
        res.send(data);

    } catch (error) {
        console.error('DeepL proxy error:', error);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

// Protected glossary creation endpoint
app.post('/api/deepl-glossary', authenticateToken, async (req, res) => {
    const baseUrl = getDeepLBaseUrl();

    console.log('[Glossary] Creating glossary...');

    try {
        const formBody = new URLSearchParams();
        formBody.append('name', req.body.name);
        formBody.append('source_lang', req.body.source_lang);
        formBody.append('target_lang', req.body.target_lang);
        formBody.append('entries', req.body.entries);
        formBody.append('entries_format', req.body.entries_format);

        const response = await fetch(`${baseUrl}/v2/glossaries`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formBody.toString()
        });

        const data = await response.text();
        console.log('[Glossary] Response:', response.status, data);

        res.status(response.status);
        res.set('Content-Type', 'application/json');
        res.send(data);

    } catch (error) {
        console.error('Glossary creation error:', error);
        res.status(500).json({ error: 'Glossary creation failed', details: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Interpreter server running on port ${PORT}`);
});

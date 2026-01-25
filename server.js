require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

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

// In-memory room storage
const rooms = new Map();

// Generate a short room ID
function generateRoomId() {
    return crypto.randomBytes(3).toString('hex'); // 6 character hex string
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

// Login endpoint - now returns roomId
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    if (password !== APP_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate room ID for this session
    const roomId = generateRoomId();

    // Create JWT token (expires in 24 hours) with roomId
    const token = jwt.sign({ authenticated: true, roomId }, JWT_SECRET, { expiresIn: '24h' });

    // Initialize room state
    rooms.set(roomId, {
        interpreterWs: null,
        audienceWs: new Set(),
        state: {
            isListening: false,
            direction: 'en-to-zh',
            sentences: { source: [], target: [] }
        }
    });

    console.log(`[Room] Created room ${roomId}`);

    res.json({ token, roomId });
});

// Protected endpoint to get Deepgram API key
app.get('/api/config/deepgram', authenticateToken, (req, res) => {
    res.json({ apiKey: DEEPGRAM_API_KEY });
});

// Get room info (for reconnection)
app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
        exists: true,
        state: room.state,
        audienceCount: room.audienceWs.size
    });
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

// Serve audience view
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'audience.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('room');
    const role = url.searchParams.get('role'); // 'interpreter' or 'audience'

    console.log(`[WS] Connection: role=${role}, room=${roomId}`);

    if (!roomId) {
        ws.close(4000, 'Room ID required');
        return;
    }

    const room = rooms.get(roomId);
    if (!room) {
        ws.close(4001, 'Room not found');
        return;
    }

    if (role === 'interpreter') {
        // Interpreter connection
        room.interpreterWs = ws;

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                handleInterpreterMessage(roomId, message);
            } catch (e) {
                console.error('[WS] Invalid message:', e);
            }
        });

        ws.on('close', () => {
            console.log(`[WS] Interpreter disconnected from room ${roomId}`);
            room.interpreterWs = null;
            // Notify audience that interpreter disconnected
            broadcastToAudience(roomId, {
                type: 'status',
                isListening: false,
                interpreterConnected: false
            });
        });

    } else {
        // Audience connection
        room.audienceWs.add(ws);
        console.log(`[WS] Audience joined room ${roomId} (${room.audienceWs.size} viewers)`);

        // Send current state to new audience member
        ws.send(JSON.stringify({
            type: 'init',
            state: room.state,
            interpreterConnected: room.interpreterWs !== null
        }));

        ws.on('close', () => {
            room.audienceWs.delete(ws);
            console.log(`[WS] Audience left room ${roomId} (${room.audienceWs.size} viewers)`);
        });
    }
});

function handleInterpreterMessage(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return;

    switch (message.type) {
        case 'status':
            // Update listening status and direction
            room.state.isListening = message.isListening;
            if (message.direction) {
                room.state.direction = message.direction;
            }
            broadcastToAudience(roomId, {
                type: 'status',
                isListening: room.state.isListening,
                direction: room.state.direction,
                interpreterConnected: true
            });
            break;

        case 'sentence':
            // Add new sentence
            room.state.sentences.source.push(message.source);
            room.state.sentences.target.push(message.target);
            broadcastToAudience(roomId, {
                type: 'sentence',
                source: message.source,
                target: message.target
            });
            break;

        case 'clear':
            // Clear sentences
            room.state.sentences = { source: [], target: [] };
            broadcastToAudience(roomId, { type: 'clear' });
            break;
    }
}

function broadcastToAudience(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const client of room.audienceWs) {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(data);
        }
    }
}

// Clean up old rooms periodically (every hour)
setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        // Remove rooms with no connections for over 2 hours
        if (!room.interpreterWs && room.audienceWs.size === 0) {
            rooms.delete(roomId);
            console.log(`[Room] Cleaned up inactive room ${roomId}`);
        }
    }
}, 60 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Interpreter server running on port ${PORT}`);
});

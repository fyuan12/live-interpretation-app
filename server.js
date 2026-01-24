const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Proxy endpoint for DeepL API
app.all('/api/deepl/*', async (req, res) => {
    const deeplPath = req.params[0]; // e.g., "v2/usage" or "v2/translate"
    const apiKey = req.headers['authorization'];
    
    if (!apiKey) {
        return res.status(400).json({ error: 'Missing Authorization header' });
    }
    
    // Determine which DeepL endpoint to use based on API key
    const baseUrl = apiKey.includes(':fx') 
        ? 'https://api-free.deepl.com' 
        : 'https://api.deepl.com';
    
    const url = `${baseUrl}/${deeplPath}`;
    
    console.log(`[Proxy] ${req.method} ${url}`);
    console.log('[Proxy] Body:', req.body);
    
    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': apiKey
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

// Glossary creation endpoint
app.post('/api/deepl-glossary', async (req, res) => {
    const apiKey = req.headers['authorization'];
    
    if (!apiKey) {
        return res.status(400).json({ error: 'Missing Authorization header' });
    }
    
    const baseUrl = apiKey.includes(':fx') 
        ? 'https://api-free.deepl.com' 
        : 'https://api.deepl.com';
    
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
                'Authorization': apiKey,
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

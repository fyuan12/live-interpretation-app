// Live Gospel Interpreter - Main Application
// Combines Deepgram speech-to-text with DeepL translation and LDS glossary

class LiveInterpreter {
    constructor() {
        // Auth state
        this.authToken = sessionStorage.getItem('auth_token') || '';
        this.roomId = sessionStorage.getItem('room_id') || '';
        this.deepgramKey = '';

        // Glossary state
        this.glossaryEnToZh = localStorage.getItem('deepl_glossary_en_zh') || '';
        this.glossaryZhToEn = localStorage.getItem('deepl_glossary_zh_en') || '';

        // Listening state
        this.isListening = false;
        this.sentences = { source: [], target: [] };

        // Deepgram WebSocket
        this.deepgramSocket = null;
        this.mediaStream = null;
        this.mediaRecorder = null;

        // Broadcast WebSocket (to audience)
        this.broadcastSocket = null;

        // Translation direction: 'en-to-zh' or 'zh-to-en'
        this.direction = localStorage.getItem('translation_direction') || 'en-to-zh';

        // Font settings with defaults
        this.fontSettings = {
            englishFont: localStorage.getItem('font_english') || "'Source Serif 4', Georgia, serif",
            englishSize: parseFloat(localStorage.getItem('font_english_size')) || 2,
            chineseFont: localStorage.getItem('font_chinese') || "'Noto Sans SC', 'PingFang SC', sans-serif",
            chineseSize: parseFloat(localStorage.getItem('font_chinese_size')) || 2.2
        };

        // DOM Elements
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            directionBtn: document.getElementById('directionBtn'),
            directionLabel: document.getElementById('directionLabel'),
            status: document.getElementById('status'),
            panelLeft: document.getElementById('panelLeft'),
            panelRight: document.getElementById('panelRight'),
            leftText: document.getElementById('leftText'),
            rightText: document.getElementById('rightText'),
            leftLabel: document.getElementById('leftLabel'),
            rightLabel: document.getElementById('rightLabel'),
            leftPlaceholder: document.getElementById('leftPlaceholder'),
            rightPlaceholder: document.getElementById('rightPlaceholder'),
            glossaryStatus: document.getElementById('glossaryStatus'),
            // Room link elements
            roomLinkContainer: document.getElementById('roomLinkContainer'),
            roomLinkUrl: document.getElementById('roomLinkUrl'),
            copyLinkBtn: document.getElementById('copyLinkBtn'),
            // Login elements
            loginModal: document.getElementById('loginModal'),
            loginPassword: document.getElementById('loginPassword'),
            loginBtn: document.getElementById('loginBtn'),
            loginStatus: document.getElementById('loginStatus'),
            // Font settings elements
            fontSettingsModal: document.getElementById('fontSettingsModal'),
            englishFont: document.getElementById('englishFont'),
            englishSize: document.getElementById('englishSize'),
            englishSizeValue: document.getElementById('englishSizeValue'),
            englishPreview: document.getElementById('englishPreview'),
            chineseFont: document.getElementById('chineseFont'),
            chineseSize: document.getElementById('chineseSize'),
            chineseSizeValue: document.getElementById('chineseSizeValue'),
            chinesePreview: document.getElementById('chinesePreview'),
            saveFontSettings: document.getElementById('saveFontSettings'),
            resetFonts: document.getElementById('resetFonts')
        };

        // Bind events
        this.bindEvents();

        // Apply saved font settings and direction
        this.applyFontSettings();
        this.updateDirectionUI();

        // Check if already authenticated
        if (this.authToken && this.roomId) {
            this.verifyTokenAndInitialize();
        }
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startListening());
        this.elements.stopBtn.addEventListener('click', () => this.stopListening());
        this.elements.loginBtn.addEventListener('click', () => this.login());
        this.elements.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Direction toggle
        this.elements.directionBtn.addEventListener('click', () => this.toggleDirection());

        // Font settings events
        this.elements.settingsBtn.addEventListener('click', () => this.openFontSettings());
        this.elements.saveFontSettings.addEventListener('click', () => this.saveFontSettings());
        this.elements.resetFonts.addEventListener('click', () => this.resetFontSettings());

        // Live preview for font changes
        this.elements.englishFont.addEventListener('change', () => this.updateFontPreview('english'));
        this.elements.englishSize.addEventListener('input', () => this.updateFontPreview('english'));
        this.elements.chineseFont.addEventListener('change', () => this.updateFontPreview('chinese'));
        this.elements.chineseSize.addEventListener('input', () => this.updateFontPreview('chinese'));

        // Close modal when clicking outside
        this.elements.fontSettingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.fontSettingsModal) {
                this.elements.fontSettingsModal.classList.remove('active');
            }
        });

        // Copy room link
        this.elements.copyLinkBtn.addEventListener('click', () => this.copyRoomLink());
        this.elements.roomLinkUrl.addEventListener('click', () => this.copyRoomLink());
    }

    async login() {
        const password = this.elements.loginPassword.value.trim();

        if (!password) {
            this.showLoginStatus('Please enter a password.', 'error');
            return;
        }

        this.showLoginStatus('Logging in...', 'loading');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            const data = await response.json();
            this.authToken = data.token;
            this.roomId = data.roomId;
            sessionStorage.setItem('auth_token', this.authToken);
            sessionStorage.setItem('room_id', this.roomId);

            this.showLoginStatus('Login successful!', 'success');

            // Initialize the app
            await this.initializeApp();

        } catch (error) {
            console.error('Login error:', error);
            this.showLoginStatus(error.message, 'error');
        }
    }

    async verifyTokenAndInitialize() {
        try {
            // Try to fetch Deepgram key to verify token is still valid
            const response = await fetch('/api/config/deepgram', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (!response.ok) {
                // Token invalid, show login
                this.authToken = '';
                this.roomId = '';
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('room_id');
                return;
            }

            const data = await response.json();
            this.deepgramKey = data.apiKey;

            // Verify room still exists
            const roomResponse = await fetch(`/api/room/${this.roomId}`);
            if (!roomResponse.ok) {
                // Room doesn't exist, need fresh login
                this.authToken = '';
                this.roomId = '';
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('room_id');
                return;
            }

            // Token valid, hide login modal
            this.elements.loginModal.classList.remove('active');

            // Setup glossaries if needed
            if (!this.glossaryEnToZh || !this.glossaryZhToEn) {
                await this.createGlossaries();
            }

            this.updateGlossaryStatus();
            this.showRoomLink();
            this.connectBroadcastSocket();

        } catch (error) {
            console.error('Token verification error:', error);
            this.authToken = '';
            this.roomId = '';
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('room_id');
        }
    }

    async initializeApp() {
        try {
            // Fetch Deepgram API key
            this.showLoginStatus('Fetching configuration...', 'loading');

            const response = await fetch('/api/config/deepgram', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch configuration');
            }

            const data = await response.json();
            this.deepgramKey = data.apiKey;

            // Create glossaries if needed
            if (!this.glossaryEnToZh || !this.glossaryZhToEn) {
                this.showLoginStatus('Setting up glossaries...', 'loading');
                await this.createGlossaries();
            }

            this.showLoginStatus('Ready!', 'success');

            setTimeout(() => {
                this.elements.loginModal.classList.remove('active');
                this.updateGlossaryStatus();
                this.showRoomLink();
                this.connectBroadcastSocket();
            }, 500);

        } catch (error) {
            console.error('Initialization error:', error);
            this.showLoginStatus(`Setup failed: ${error.message}`, 'error');
        }
    }

    showRoomLink() {
        if (!this.roomId) return;

        const baseUrl = window.location.origin;
        const viewUrl = `${baseUrl}/view?room=${this.roomId}`;

        this.elements.roomLinkUrl.textContent = viewUrl;
        this.elements.roomLinkContainer.style.display = 'flex';
    }

    copyRoomLink() {
        const url = this.elements.roomLinkUrl.textContent;
        navigator.clipboard.writeText(url).then(() => {
            // Visual feedback
            const originalText = this.elements.roomLinkUrl.textContent;
            this.elements.roomLinkUrl.textContent = 'Copied!';
            setTimeout(() => {
                this.elements.roomLinkUrl.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    connectBroadcastSocket() {
        if (!this.roomId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?room=${this.roomId}&role=interpreter`;

        this.broadcastSocket = new WebSocket(wsUrl);

        this.broadcastSocket.onopen = () => {
            console.log('Broadcast WebSocket connected');
            // Send initial status
            this.broadcastStatus();
        };

        this.broadcastSocket.onclose = () => {
            console.log('Broadcast WebSocket closed');
            // Reconnect after a delay
            setTimeout(() => {
                if (this.authToken && this.roomId) {
                    this.connectBroadcastSocket();
                }
            }, 3000);
        };

        this.broadcastSocket.onerror = (error) => {
            console.error('Broadcast WebSocket error:', error);
        };
    }

    broadcastStatus() {
        if (this.broadcastSocket?.readyState === WebSocket.OPEN) {
            this.broadcastSocket.send(JSON.stringify({
                type: 'status',
                isListening: this.isListening,
                direction: this.direction
            }));
        }
    }

    broadcastSentence(source, target) {
        if (this.broadcastSocket?.readyState === WebSocket.OPEN) {
            this.broadcastSocket.send(JSON.stringify({
                type: 'sentence',
                source,
                target
            }));
        }
    }

    broadcastClear() {
        if (this.broadcastSocket?.readyState === WebSocket.OPEN) {
            this.broadcastSocket.send(JSON.stringify({
                type: 'clear'
            }));
        }
    }

    showLoginStatus(message, type) {
        this.elements.loginStatus.textContent = message;
        this.elements.loginStatus.className = `setup-status ${type}`;
    }

    async createGlossaries() {
        // Get existing glossaries
        const listResponse = await fetch('/api/deepl/v2/glossaries', {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        let existingGlossaries = [];
        if (listResponse.ok) {
            const data = await listResponse.json();
            existingGlossaries = data.glossaries || [];
        }

        // Create EN→ZH glossary if needed
        const existingEnZh = existingGlossaries.find(g => g.name === 'LDS Gospel Terms EN-ZH');
        if (existingEnZh) {
            this.glossaryEnToZh = existingEnZh.glossary_id;
            console.log('Using existing EN→ZH glossary:', this.glossaryEnToZh);
        } else {
            const entriesEnZh = LDS_GLOSSARY.map(([en, zh]) => `${en}\t${zh}`).join('\n');

            const responseEnZh = await fetch('/api/deepl-glossary', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'LDS Gospel Terms EN-ZH',
                    source_lang: 'en',
                    target_lang: 'zh',
                    entries: entriesEnZh,
                    entries_format: 'tsv'
                })
            });

            if (!responseEnZh.ok) {
                const errorText = await responseEnZh.text();
                throw new Error(`EN→ZH glossary error: ${responseEnZh.status} - ${errorText}`);
            }

            const dataEnZh = await responseEnZh.json();
            this.glossaryEnToZh = dataEnZh.glossary_id;
            console.log('Created EN→ZH glossary:', this.glossaryEnToZh);
        }
        localStorage.setItem('deepl_glossary_en_zh', this.glossaryEnToZh);

        // Create ZH→EN glossary if needed (reverse the entries)
        const existingZhEn = existingGlossaries.find(g => g.name === 'LDS Gospel Terms ZH-EN');
        if (existingZhEn) {
            this.glossaryZhToEn = existingZhEn.glossary_id;
            console.log('Using existing ZH→EN glossary:', this.glossaryZhToEn);
        } else {
            // Reverse the glossary entries: [zh, en] instead of [en, zh]
            // Dedupe by Chinese term (keep first occurrence only)
            const seenZh = new Set();
            const dedupedEntries = LDS_GLOSSARY.filter(([en, zh]) => {
                if (seenZh.has(zh)) {
                    return false;
                }
                seenZh.add(zh);
                return true;
            });
            const entriesZhEn = dedupedEntries.map(([en, zh]) => `${zh}\t${en}`).join('\n');
            console.log(`ZH→EN glossary: ${dedupedEntries.length} entries (deduped from ${LDS_GLOSSARY.length})`);

            const responseZhEn = await fetch('/api/deepl-glossary', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'LDS Gospel Terms ZH-EN',
                    source_lang: 'zh',
                    target_lang: 'en',
                    entries: entriesZhEn,
                    entries_format: 'tsv'
                })
            });

            if (!responseZhEn.ok) {
                const errorText = await responseZhEn.text();
                throw new Error(`ZH→EN glossary error: ${responseZhEn.status} - ${errorText}`);
            }

            const dataZhEn = await responseZhEn.json();
            this.glossaryZhToEn = dataZhEn.glossary_id;
            console.log('Created ZH→EN glossary:', this.glossaryZhToEn);
        }
        localStorage.setItem('deepl_glossary_zh_en', this.glossaryZhToEn);
    }

    toggleDirection() {
        // Don't allow switching while listening
        if (this.isListening) {
            alert('Please stop listening before switching direction.');
            return;
        }

        // Toggle direction
        this.direction = this.direction === 'en-to-zh' ? 'zh-to-en' : 'en-to-zh';
        localStorage.setItem('translation_direction', this.direction);

        // Clear sentences
        this.sentences = { source: [], target: [] };

        // Update UI
        this.updateDirectionUI();
        this.updateGlossaryStatus();
        this.broadcastStatus();
        this.broadcastClear();

        // Reset display
        this.elements.leftText.innerHTML = `<div class="spacer"></div><p class="placeholder">${this.elements.leftPlaceholder.textContent}</p>`;
        this.elements.rightText.innerHTML = `<div class="spacer"></div><p class="placeholder">${this.elements.rightPlaceholder.textContent}</p>`;
    }

    updateDirectionUI() {
        if (this.direction === 'en-to-zh') {
            this.elements.directionLabel.textContent = 'EN → 中文';
            this.elements.leftLabel.textContent = 'English';
            this.elements.rightLabel.textContent = '中文';
            this.elements.leftPlaceholder.textContent = 'Speech will appear here...';
            this.elements.rightPlaceholder.textContent = '翻译将显示在这里...';

            // Apply fonts: English on left, Chinese on right
            document.documentElement.style.setProperty('--font-left', this.fontSettings.englishFont);
            document.documentElement.style.setProperty('--font-size-left', `${this.fontSettings.englishSize}rem`);
            document.documentElement.style.setProperty('--font-right', this.fontSettings.chineseFont);
            document.documentElement.style.setProperty('--font-size-right', `${this.fontSettings.chineseSize}rem`);
        } else {
            this.elements.directionLabel.textContent = '中文 → EN';
            this.elements.leftLabel.textContent = '中文';
            this.elements.rightLabel.textContent = 'English';
            this.elements.leftPlaceholder.textContent = '语音将显示在这里...';
            this.elements.rightPlaceholder.textContent = 'Translation will appear here...';

            // Apply fonts: Chinese on left, English on right
            document.documentElement.style.setProperty('--font-left', this.fontSettings.chineseFont);
            document.documentElement.style.setProperty('--font-size-left', `${this.fontSettings.chineseSize}rem`);
            document.documentElement.style.setProperty('--font-right', this.fontSettings.englishFont);
            document.documentElement.style.setProperty('--font-size-right', `${this.fontSettings.englishSize}rem`);
        }
    }

    updateGlossaryStatus() {
        const currentGlossary = this.direction === 'en-to-zh' ? this.glossaryEnToZh : this.glossaryZhToEn;
        if (currentGlossary) {
            this.elements.glossaryStatus.textContent = `Glossary: Ready (${this.direction === 'en-to-zh' ? 'EN→ZH' : 'ZH→EN'})`;
        } else {
            this.elements.glossaryStatus.textContent = 'Glossary: Not available';
        }
    }

    openFontSettings() {
        // Set current values in the form
        this.elements.englishFont.value = this.fontSettings.englishFont;
        this.elements.englishSize.value = this.fontSettings.englishSize;
        this.elements.englishSizeValue.textContent = this.fontSettings.englishSize;

        this.elements.chineseFont.value = this.fontSettings.chineseFont;
        this.elements.chineseSize.value = this.fontSettings.chineseSize;
        this.elements.chineseSizeValue.textContent = this.fontSettings.chineseSize;

        // Update previews
        this.updateFontPreview('english');
        this.updateFontPreview('chinese');

        // Show modal
        this.elements.fontSettingsModal.classList.add('active');
    }

    updateFontPreview(panel) {
        if (panel === 'english') {
            const font = this.elements.englishFont.value;
            const size = this.elements.englishSize.value;
            this.elements.englishSizeValue.textContent = size;
            this.elements.englishPreview.style.fontFamily = font;
            this.elements.englishPreview.style.fontSize = `${size}rem`;
        } else {
            const font = this.elements.chineseFont.value;
            const size = this.elements.chineseSize.value;
            this.elements.chineseSizeValue.textContent = size;
            this.elements.chinesePreview.style.fontFamily = font;
            this.elements.chinesePreview.style.fontSize = `${size}rem`;
        }
    }

    saveFontSettings() {
        // Update state
        this.fontSettings.englishFont = this.elements.englishFont.value;
        this.fontSettings.englishSize = parseFloat(this.elements.englishSize.value);
        this.fontSettings.chineseFont = this.elements.chineseFont.value;
        this.fontSettings.chineseSize = parseFloat(this.elements.chineseSize.value);

        // Save to localStorage
        localStorage.setItem('font_english', this.fontSettings.englishFont);
        localStorage.setItem('font_english_size', this.fontSettings.englishSize);
        localStorage.setItem('font_chinese', this.fontSettings.chineseFont);
        localStorage.setItem('font_chinese_size', this.fontSettings.chineseSize);

        // Apply to panels
        this.applyFontSettings();

        // Close modal
        this.elements.fontSettingsModal.classList.remove('active');
    }

    resetFontSettings() {
        // Reset to defaults
        this.elements.englishFont.value = "'Source Serif 4', Georgia, serif";
        this.elements.englishSize.value = 2;
        this.elements.chineseFont.value = "'Noto Sans SC', 'PingFang SC', sans-serif";
        this.elements.chineseSize.value = 2.2;

        // Update previews
        this.updateFontPreview('english');
        this.updateFontPreview('chinese');
    }

    applyFontSettings() {
        // Store in CSS variables (will be applied based on direction)
        document.documentElement.style.setProperty('--font-english', this.fontSettings.englishFont);
        document.documentElement.style.setProperty('--font-size-english', `${this.fontSettings.englishSize}rem`);
        document.documentElement.style.setProperty('--font-chinese', this.fontSettings.chineseFont);
        document.documentElement.style.setProperty('--font-size-chinese', `${this.fontSettings.chineseSize}rem`);

        // Apply based on current direction
        this.updateDirectionUI();
    }

    // Check if scrolled to bottom (with 50px tolerance)
    isScrolledToBottom(element) {
        return element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    }

    async startListening() {
        if (!this.authToken) {
            this.elements.loginModal.classList.add('active');
            return;
        }

        if (!this.deepgramKey) {
            alert('Deepgram configuration not loaded. Please refresh and try again.');
            return;
        }

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            // Connect to Deepgram
            await this.initDeepgramConnection();

            this.isListening = true;

            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.elements.directionBtn.disabled = true;
            this.elements.status.classList.add('listening');
            this.elements.status.querySelector('.status-text').textContent = 'Listening...';

            // Clear placeholders and add spacer
            this.elements.leftText.innerHTML = '<div class="spacer"></div>';
            this.elements.rightText.innerHTML = '<div class="spacer"></div>';

            // Broadcast status
            this.broadcastStatus();

        } catch (error) {
            console.error('Error starting listening:', error);
            if (error.name === 'NotAllowedError') {
                alert('Microphone access denied. Please allow microphone access and try again.');
            } else {
                alert(`Error starting listening: ${error.message}`);
            }
        }
    }

    async initDeepgramConnection() {
        const language = this.direction === 'en-to-zh' ? 'en-US' : 'zh-CN';

        // Deepgram WebSocket URL with parameters
        const url = `wss://api.deepgram.com/v1/listen?` + new URLSearchParams({
            model: 'nova-2',
            language: language,
            smart_format: 'true',
            punctuate: 'true',
            interim_results: 'false',
            utterances: 'true',
            vad_events: 'true',
            endpointing: '1000'
        });

        return new Promise((resolve, reject) => {
            this.deepgramSocket = new WebSocket(url, ['token', this.deepgramKey]);

            this.deepgramSocket.onopen = () => {
                console.log('Deepgram WebSocket connected');
                this.startMediaRecorder();
                resolve();
            };

            this.deepgramSocket.onmessage = (event) => {
                this.handleDeepgramTranscript(event);
            };

            this.deepgramSocket.onerror = (error) => {
                console.error('Deepgram WebSocket error:', error);
                reject(error);
            };

            this.deepgramSocket.onclose = (event) => {
                console.log('Deepgram WebSocket closed:', event.code, event.reason);
                if (this.isListening) {
                    // Reconnect if still supposed to be listening
                    console.log('Reconnecting to Deepgram...');
                    setTimeout(() => {
                        if (this.isListening) {
                            this.initDeepgramConnection().catch(console.error);
                        }
                    }, 1000);
                }
            };
        });
    }

    startMediaRecorder() {
        // Use MediaRecorder to capture audio and send to Deepgram
        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.deepgramSocket?.readyState === WebSocket.OPEN) {
                this.deepgramSocket.send(event.data);
            }
        };

        // Send audio data every 250ms
        this.mediaRecorder.start(250);
    }

    handleDeepgramTranscript(event) {
        try {
            const data = JSON.parse(event.data);

            // Check if this is a transcript result
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
                const transcript = data.channel.alternatives[0].transcript;

                if (transcript && data.is_final) {
                    console.log('Final transcript:', transcript);
                    this.processFinalTranscript(transcript);
                }
            }
        } catch (error) {
            console.error('Error parsing Deepgram response:', error);
        }
    }

    stopListening() {
        this.isListening = false;

        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Close WebSocket
        if (this.deepgramSocket) {
            this.deepgramSocket.close();
            this.deepgramSocket = null;
        }

        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.directionBtn.disabled = false;
        this.elements.status.classList.remove('listening');
        this.elements.status.querySelector('.status-text').textContent = 'Stopped';

        // Broadcast status
        this.broadcastStatus();
    }

    async processFinalTranscript(text) {
        if (!text) return;

        // Add to source sentences
        this.sentences.source.push(text);

        // Translate
        let translation;
        try {
            translation = await this.translate(text);
            this.sentences.target.push(translation);
        } catch (error) {
            console.error('Translation error:', error);
            translation = '[Translation error]';
            this.sentences.target.push(translation);
        }

        // Broadcast to audience
        this.broadcastSentence(text, translation);

        this.updateDisplay();
    }

    async translate(text) {
        const isEnToZh = this.direction === 'en-to-zh';
        const sourceLang = isEnToZh ? 'EN' : 'ZH';
        const targetLang = isEnToZh ? 'ZH' : 'EN';
        const glossaryId = isEnToZh ? this.glossaryEnToZh : this.glossaryZhToEn;

        const params = new URLSearchParams({
            text: text,
            source_lang: sourceLang,
            target_lang: targetLang
        });

        if (glossaryId) {
            params.append('glossary_id', glossaryId);
        }

        const response = await fetch('/api/deepl/v2/translate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.status}`);
        }

        const data = await response.json();
        return data.translations[0].text;
    }

    updateDisplay() {
        // Check if we should auto-scroll before updating content
        const shouldScrollLeft = this.isScrolledToBottom(this.elements.leftText);
        const shouldScrollRight = this.isScrolledToBottom(this.elements.rightText);

        // Update left panel (source) - include spacer for push-to-bottom effect
        this.elements.leftText.innerHTML = '<div class="spacer"></div>' +
            this.sentences.source
                .map(s => `<p class="sentence">${this.escapeHtml(s)}</p>`)
                .join('');

        // Update right panel (target)
        this.elements.rightText.innerHTML = '<div class="spacer"></div>' +
            this.sentences.target
                .map(s => `<p class="sentence">${this.escapeHtml(s)}</p>`)
                .join('');

        // Smart auto-scroll: only scroll if user was already at bottom
        if (shouldScrollLeft) {
            this.elements.leftText.scrollTop = this.elements.leftText.scrollHeight;
        }
        if (shouldScrollRight) {
            this.elements.rightText.scrollTop = this.elements.rightText.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.interpreter = new LiveInterpreter();
});

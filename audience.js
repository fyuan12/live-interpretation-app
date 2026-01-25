// Live Gospel Interpreter - Audience View
// Read-only view for congregation members

class AudienceView {
    constructor() {
        // Get room ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('room');

        if (!this.roomId) {
            this.showError('No room ID provided. Please use the link shared by the interpreter.');
            return;
        }

        // State
        this.isConnected = false;
        this.isListening = false;
        this.direction = 'en-to-zh';
        this.sentences = { source: [], target: [] };
        this.sourceExpanded = localStorage.getItem('audience_source_expanded') === 'true';
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;

        // Font settings
        this.fontSettings = {
            font: localStorage.getItem('audience_font') || "'Noto Sans SC', 'PingFang SC', sans-serif",
            size: parseFloat(localStorage.getItem('audience_font_size')) || 1.5
        };

        // DOM Elements
        this.elements = {
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            directionBadge: document.getElementById('directionBadge'),
            sourceToggle: document.getElementById('sourceToggle'),
            sourceToggleText: document.getElementById('sourceToggleText'),
            sourcePanel: document.getElementById('sourcePanel'),
            sourceContent: document.getElementById('sourceContent'),
            translationContent: document.getElementById('translationContent'),
            translationPlaceholder: document.getElementById('translationPlaceholder'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettings: document.getElementById('closeSettings'),
            translationFont: document.getElementById('translationFont'),
            translationSize: document.getElementById('translationSize'),
            translationSizeValue: document.getElementById('translationSizeValue'),
            fontPreview: document.getElementById('fontPreview'),
            resetSettings: document.getElementById('resetSettings'),
            saveSettings: document.getElementById('saveSettings')
        };

        // Bind events
        this.bindEvents();

        // Apply saved settings
        this.applyFontSettings();

        // Update source toggle state
        this.updateSourceToggle();

        // Connect to WebSocket
        this.connect();
    }

    bindEvents() {
        // Source toggle
        this.elements.sourceToggle.addEventListener('click', () => this.toggleSource());

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.closeSettings();
        });
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettings.addEventListener('click', () => this.resetSettings());

        // Live preview
        this.elements.translationFont.addEventListener('change', () => this.updatePreview());
        this.elements.translationSize.addEventListener('input', () => this.updatePreview());

        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.elements.errorMessage.classList.remove('visible');
            this.reconnectAttempts = 0;
            this.connect();
        });
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?room=${this.roomId}&role=audience`;

        this.updateStatus('connecting');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateStatus('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) {
                console.error('Invalid message:', e);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            this.isConnected = false;

            if (event.code === 4001) {
                // Room not found
                this.showError('Room not found. The session may have ended.');
                return;
            }

            // Attempt reconnect
            this.reconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    reconnect() {
        this.reconnectAttempts++;

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.showError('Unable to connect. Please check your connection and try again.');
            return;
        }

        this.updateStatus('reconnecting');

        // Exponential backoff: 1s, 2s, 4s, 8s, etc. up to 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => this.connect(), delay);
    }

    handleMessage(message) {
        switch (message.type) {
            case 'init':
                // Initial state from server
                this.direction = message.state.direction;
                this.isListening = message.state.isListening;
                this.sentences = message.state.sentences;
                this.updateDirectionUI();
                this.updateDisplay();
                this.updateStatus(message.interpreterConnected ? 'connected' : 'waiting');
                if (message.isListening) {
                    this.updateStatus('listening');
                }
                break;

            case 'status':
                this.isListening = message.isListening;
                if (message.direction) {
                    this.direction = message.direction;
                    this.updateDirectionUI();
                }
                if (message.interpreterConnected === false) {
                    this.updateStatus('disconnected');
                } else if (message.isListening) {
                    this.updateStatus('listening');
                } else {
                    this.updateStatus('connected');
                }
                break;

            case 'sentence':
                this.sentences.source.push(message.source);
                this.sentences.target.push(message.target);
                this.updateDisplay();
                break;

            case 'clear':
                this.sentences = { source: [], target: [] };
                this.updateDisplay();
                break;
        }
    }

    updateStatus(status) {
        const dot = this.elements.statusDot;
        const text = this.elements.statusText;

        dot.classList.remove('listening', 'disconnected');

        switch (status) {
            case 'connecting':
                text.textContent = 'Connecting...';
                break;
            case 'reconnecting':
                text.textContent = 'Reconnecting...';
                break;
            case 'connected':
                text.textContent = 'Connected';
                break;
            case 'waiting':
                text.textContent = 'Waiting for interpreter...';
                break;
            case 'listening':
                dot.classList.add('listening');
                text.textContent = 'Live';
                break;
            case 'disconnected':
                dot.classList.add('disconnected');
                text.textContent = 'Interpreter disconnected';
                break;
        }
    }

    updateDirectionUI() {
        if (this.direction === 'en-to-zh') {
            this.elements.directionBadge.textContent = 'EN → 中文';
            // Update fonts based on direction
            this.elements.sourceContent.style.fontFamily = "'Source Serif 4', Georgia, serif";
        } else {
            this.elements.directionBadge.textContent = '中文 → EN';
            this.elements.sourceContent.style.fontFamily = "'Noto Sans SC', 'PingFang SC', sans-serif";
        }
    }

    showError(message) {
        this.elements.errorMessage.querySelector('p').textContent = message;
        this.elements.errorMessage.classList.add('visible');
    }

    toggleSource() {
        this.sourceExpanded = !this.sourceExpanded;
        localStorage.setItem('audience_source_expanded', this.sourceExpanded);
        this.updateSourceToggle();
    }

    updateSourceToggle() {
        if (this.sourceExpanded) {
            this.elements.sourceToggle.classList.add('expanded');
            this.elements.sourcePanel.classList.add('expanded');
            this.elements.sourceToggleText.textContent = 'Hide source text';
        } else {
            this.elements.sourceToggle.classList.remove('expanded');
            this.elements.sourcePanel.classList.remove('expanded');
            this.elements.sourceToggleText.textContent = 'Show source text';
        }
    }

    isScrolledToBottom(element) {
        return element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    }

    updateDisplay() {
        // Check scroll position before update
        const shouldScrollTranslation = this.isScrolledToBottom(this.elements.translationContent);
        const shouldScrollSource = this.isScrolledToBottom(this.elements.sourceContent);

        // Update source content
        if (this.sentences.source.length === 0) {
            this.elements.sourceContent.innerHTML = '<p class="placeholder">Source text will appear here...</p>';
        } else {
            this.elements.sourceContent.innerHTML = this.sentences.source
                .map(s => `<p>${this.escapeHtml(s)}</p>`)
                .join('');
        }

        // Update translation content
        if (this.sentences.target.length === 0) {
            this.elements.translationContent.innerHTML = '<div class="spacer"></div><p class="placeholder">Waiting for translation...</p>';
        } else {
            this.elements.translationContent.innerHTML = '<div class="spacer"></div>' +
                this.sentences.target
                    .map(s => `<p>${this.escapeHtml(s)}</p>`)
                    .join('');
        }

        // Smart auto-scroll
        if (shouldScrollTranslation) {
            this.elements.translationContent.scrollTop = this.elements.translationContent.scrollHeight;
        }
        if (shouldScrollSource) {
            this.elements.sourceContent.scrollTop = this.elements.sourceContent.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Settings
    openSettings() {
        this.elements.translationFont.value = this.fontSettings.font;
        this.elements.translationSize.value = this.fontSettings.size;
        this.elements.translationSizeValue.textContent = this.fontSettings.size;
        this.updatePreview();
        this.elements.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.elements.settingsModal.classList.remove('active');
    }

    updatePreview() {
        const font = this.elements.translationFont.value;
        const size = this.elements.translationSize.value;
        this.elements.translationSizeValue.textContent = size;
        this.elements.fontPreview.style.fontFamily = font;
        this.elements.fontPreview.style.fontSize = `${size}rem`;
    }

    saveSettings() {
        this.fontSettings.font = this.elements.translationFont.value;
        this.fontSettings.size = parseFloat(this.elements.translationSize.value);

        localStorage.setItem('audience_font', this.fontSettings.font);
        localStorage.setItem('audience_font_size', this.fontSettings.size);

        this.applyFontSettings();
        this.closeSettings();
    }

    resetSettings() {
        this.elements.translationFont.value = "'Noto Sans SC', 'PingFang SC', sans-serif";
        this.elements.translationSize.value = 1.5;
        this.updatePreview();
    }

    applyFontSettings() {
        document.documentElement.style.setProperty('--font-size-translation', `${this.fontSettings.size}rem`);
        this.elements.translationContent.style.fontFamily = this.fontSettings.font;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.audienceView = new AudienceView();
});

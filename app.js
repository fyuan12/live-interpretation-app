// Live Gospel Interpreter - Main Application
// Combines Web Speech API with DeepL translation and LDS glossary

class LiveInterpreter {
    constructor() {
        // State
        this.apiKey = localStorage.getItem('deepl_api_key') || '';
        this.glossaryEnToZh = localStorage.getItem('deepl_glossary_en_zh') || '';
        this.glossaryZhToEn = localStorage.getItem('deepl_glossary_zh_en') || '';
        this.isListening = false;
        this.sentences = { source: [], target: [] };
        this.maxSentences = 5;
        
        // Translation direction: 'en-to-zh' or 'zh-to-en'
        this.direction = localStorage.getItem('translation_direction') || 'en-to-zh';
        
        // Font settings with defaults
        this.fontSettings = {
            englishFont: localStorage.getItem('font_english') || "'Source Serif 4', Georgia, serif",
            englishSize: parseFloat(localStorage.getItem('font_english_size')) || 2,
            chineseFont: localStorage.getItem('font_chinese') || "'Noto Sans SC', 'PingFang SC', sans-serif",
            chineseSize: parseFloat(localStorage.getItem('font_chinese_size')) || 2.2
        };
        
        // Speech Recognition
        this.recognition = null;
        this.initSpeechRecognition();
        
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
            sentenceCount: document.getElementById('sentenceCount'),
            glossaryStatus: document.getElementById('glossaryStatus'),
            setupModal: document.getElementById('setupModal'),
            setupApiKey: document.getElementById('setupApiKey'),
            initializeApp: document.getElementById('initializeApp'),
            setupStatus: document.getElementById('setupStatus'),
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
        
        // Check if already configured
        if (this.apiKey && this.glossaryEnToZh) {
            this.elements.setupModal.classList.remove('active');
            this.updateGlossaryStatus();
        }
    }
    
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.updateRecognitionLanguage();
        
        this.recognition.onresult = (event) => this.handleSpeechResult(event);
        this.recognition.onerror = (event) => this.handleSpeechError(event);
        this.recognition.onend = () => this.handleSpeechEnd();
    }
    
    updateRecognitionLanguage() {
        if (this.recognition) {
            this.recognition.lang = this.direction === 'en-to-zh' ? 'en-US' : 'zh-CN';
        }
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startListening());
        this.elements.stopBtn.addEventListener('click', () => this.stopListening());
        this.elements.sentenceCount.addEventListener('change', (e) => {
            this.maxSentences = parseInt(e.target.value);
            this.updateDisplay();
        });
        this.elements.initializeApp.addEventListener('click', () => this.initialize());
        
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
        this.updateRecognitionLanguage();
        this.updateGlossaryStatus();
        
        // Reset display
        this.elements.leftText.innerHTML = `<p class="placeholder">${this.elements.leftPlaceholder.textContent}</p>`;
        this.elements.rightText.innerHTML = `<p class="placeholder">${this.elements.rightPlaceholder.textContent}</p>`;
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
    
    async initialize() {
        const apiKey = this.elements.setupApiKey.value.trim();
        
        if (!apiKey) {
            this.showSetupStatus('Please enter your DeepL API key.', 'error');
            return;
        }
        
        this.showSetupStatus('Validating API key...', 'loading');
        
        // Test the API key via our proxy
        try {
            const response = await fetch('/api/deepl/v2/usage', {
                headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API validation failed:', response.status, errorText);
                throw new Error('Invalid API key');
            }
            
            console.log('API key validated successfully');
        } catch (error) {
            console.error('API validation error:', error);
            this.showSetupStatus('Invalid API key. Please check and try again.', 'error');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('deepl_api_key', apiKey);
        
        // Create glossaries for both directions
        this.showSetupStatus('Creating EN→ZH glossary...', 'loading');
        
        try {
            await this.createGlossaries();
            this.showSetupStatus('Setup complete! Both glossaries ready.', 'success');
            
            setTimeout(() => {
                this.elements.setupModal.classList.remove('active');
                this.updateGlossaryStatus();
            }, 1500);
        } catch (error) {
            console.error('Glossary creation error:', error);
            this.showSetupStatus(`Glossary creation failed: ${error.message}. You can still use translation without glossaries.`, 'error');
            
            setTimeout(() => {
                this.elements.setupModal.classList.remove('active');
                this.updateGlossaryStatus();
            }, 3000);
        }
    }
    
    async createGlossaries() {
        // Get existing glossaries
        const listResponse = await fetch('/api/deepl/v2/glossaries', {
            headers: { 'Authorization': `DeepL-Auth-Key ${this.apiKey}` }
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
            this.showSetupStatus('Creating EN→ZH glossary...', 'loading');
            const entriesEnZh = LDS_GLOSSARY.map(([en, zh]) => `${en}\t${zh}`).join('\n');
            
            const responseEnZh = await fetch('/api/deepl-glossary', {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
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
            this.showSetupStatus('Creating ZH→EN glossary...', 'loading');
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
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
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
    
    showSetupStatus(message, type) {
        this.elements.setupStatus.textContent = message;
        this.elements.setupStatus.className = `setup-status ${type}`;
    }
    
    startListening() {
        if (!this.recognition) {
            alert('Speech recognition not available.');
            return;
        }
        
        if (!this.apiKey) {
            this.elements.setupModal.classList.add('active');
            return;
        }
        
        this.isListening = true;
        this.recognition.start();
        
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.elements.directionBtn.disabled = true;
        this.elements.status.classList.add('listening');
        this.elements.status.querySelector('.status-text').textContent = 'Listening...';
        
        // Clear placeholders
        this.elements.leftText.innerHTML = '';
        this.elements.rightText.innerHTML = '';
    }
    
    stopListening() {
        this.isListening = false;
        this.recognition.stop();
        
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.directionBtn.disabled = false;
        this.elements.status.classList.remove('listening');
        this.elements.status.querySelector('.status-text').textContent = 'Stopped';
    }
    
    handleSpeechResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            this.processFinalTranscript(finalTranscript.trim());
        }
    }
    
    async processFinalTranscript(text) {
        if (!text) return;
        
        // Add to source sentences
        this.sentences.source.push(text);
        
        // Translate
        try {
            const translation = await this.translate(text);
            this.sentences.target.push(translation);
        } catch (error) {
            console.error('Translation error:', error);
            this.sentences.target.push('[Translation error]');
        }
        
        // Trim to max sentences
        while (this.sentences.source.length > this.maxSentences) {
            this.sentences.source.shift();
            this.sentences.target.shift();
        }
        
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
                'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
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
        // Update left panel (source)
        this.elements.leftText.innerHTML = this.sentences.source
            .map(s => `<p class="sentence">${this.escapeHtml(s)}</p>`)
            .join('');
        
        // Update right panel (target)
        this.elements.rightText.innerHTML = this.sentences.target
            .map(s => `<p class="sentence">${this.escapeHtml(s)}</p>`)
            .join('');
        
        // Scroll to bottom
        this.elements.leftText.scrollTop = this.elements.leftText.scrollHeight;
        this.elements.rightText.scrollTop = this.elements.rightText.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        
        this.elements.status.classList.remove('listening');
        this.elements.status.classList.add('error');
        this.elements.status.querySelector('.status-text').textContent = `Error: ${event.error}`;
        
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access and reload the page.');
        }
    }
    
    handleSpeechEnd() {
        // Auto-restart if still supposed to be listening
        if (this.isListening) {
            this.recognition.start();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.interpreter = new LiveInterpreter();
});

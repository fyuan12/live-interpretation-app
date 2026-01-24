# Live Gospel Interpreter

A real-time English to Simplified Chinese interpretation tool designed for LDS church meetings. Uses the Web Speech API for speech recognition and DeepL for translation, with a custom glossary of LDS terminology to ensure accurate gospel term translations.

## Features

- **Real-time speech-to-text** using Chrome's Web Speech API
- **DeepL translation** with custom glossary support
- **150+ LDS terms** pre-configured for accurate gospel translation
- **Side-by-side display** optimized for projection
- **Adjustable sentence history** (3-10 sentences)
- **Dark theme** for comfortable viewing

## Requirements

- **Google Chrome** (required for Web Speech API)
- **DeepL API Pro account** ($5.75/month + usage)
- **Microphone** access
- **Internet connection**

## Quick Start

1. **Open the application**
   - Simply open `index.html` in Google Chrome
   - Or run a local server: `python3 -m http.server 8000` and visit `http://localhost:8000`

2. **Enter your DeepL API key**
   - Get your key from [deepl.com/your-account/keys](https://www.deepl.com/your-account/keys)
   - The app will automatically create the LDS glossary

3. **Allow microphone access** when prompted

4. **Click "Start Listening"** and begin speaking

## Glossary Terms

The glossary includes translations for:

- **Core gospel terms**: Heavenly Father, Atonement, salvation, etc.
- **Priesthood**: Melchizedek/Aaronic Priesthood, ordination, keys
- **Organizations**: Relief Society, Young Women/Men, Primary, wards, stakes
- **Ordinances**: baptism, sacrament, endowment, sealing
- **Temple terms**: temple recommend, baptism for the dead
- **Plan of salvation**: premortal life, kingdoms of glory, resurrection
- **Scriptures**: Book of Mormon, Doctrine and Covenants, etc.
- **Leadership**: prophet, apostle, bishop, stake president

See `glossary.js` for the complete list.

## Customizing the Glossary

To add or modify terms, edit `glossary.js`:

```javascript
const LDS_GLOSSARY = [
    ["English term", "中文翻译"],
    // Add your terms here
];
```

After editing, you'll need to delete the existing glossary in DeepL and reinitialize the app to create a new one.

## Tips for Best Results

1. **Speak clearly** and at a moderate pace
2. **Use a good microphone** - external mics work better than laptop mics
3. **Minimize background noise**
4. **Position the laptop** close to the speaker if possible
5. **Test before the meeting** to ensure everything works

## Troubleshooting

### "Speech recognition not supported"
- Make sure you're using Google Chrome

### "Microphone access denied"
- Click the lock icon in the address bar and allow microphone access

### Poor recognition accuracy
- Check microphone input levels
- Reduce background noise
- Speak more clearly/slowly

### Translation errors
- Check your internet connection
- Verify your DeepL API key is valid and has available quota

## File Structure

```
live-interpreter/
├── index.html      # Main HTML file
├── styles.css      # Styling (optimized for projection)
├── app.js          # Main application logic
├── glossary.js     # LDS terminology definitions
└── README.md       # This file
```

## Privacy Note

- Speech is processed through Google's servers (Web Speech API)
- Translations are processed through DeepL's servers
- Your API key is stored in browser localStorage
- No data is stored permanently or sent to other parties

## Cost Estimate

- **DeepL Pro API**: $5.75/month base + ~$0.75-1.25 per lesson
- Typical lesson (30-40 min): ~30,000-50,000 characters
- Monthly cost for weekly use: ~$10-12

## License

MIT License - Free to use and modify for church purposes.

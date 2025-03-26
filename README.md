# 🚫 YouTube AdBlocker

A powerful TypeScript-based Chrome extension designed to block ads on YouTube using advanced techniques and continuously updated filter lists.

## 📌 Description

Tired of YouTube ads interrupting your binge-watching sessions? This extension is your digital bouncer, kicking ads to the curb with a combination of DOM manipulation, network request filtering, and some seriously clever anti-adblock magic. 🎥✨

## ✨ Features

- **Video Ad Removal**: Sayonara to pre-roll, mid-roll, and overlay video ads
- **Banner & Sponsored Content Blocking**: Bye-bye, distracting promotional content
- **Dynamic Domain Blocking**: Automatically updates ad domain lists in real-time
- **Performance Tracking**: Counts blocked ads without breaking a sweat
- **Anti-Adblock Bypass**: Outsmarting YouTube's ad detection mechanisms
- **Lightweight & Efficient**: Runs smoother than a well-oiled machine

## 🛠️ How It Works

### Core Components

- **Content Script**: Your DOM watchdog, removing ad elements on sight
- **Background Script**: Network filtering ninja and blocking stats keeper
- **Bridge Script**: Secure communication backbone
- **Performance Tracker**: Metrics logger with zero performance overhead

### Dynamic Domain List

Powered by the comprehensive ad domain list from `kboghdady/youTube_ads_4_pi-hole`:

- Automatically refreshed every 24 hours
- Offline-ready with local caching
- Converted to Chrome's `declarativeNetRequest` rules for lightning-fast blocking

## 🚀 Installation

### From Source Code

1. Clone the repository:
   ```bash
   git clone https://github.com/xDarkicex/youtube-adblocker.git
   cd youtube-adblocker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Development Setup

**Prerequisites:**
- Node.js (v14+)
- npm (v6+)
- ImageMagick (for icon generation)

## 🛠️ Build & Development

- **Build**: `npm run build`
- **Development Mode**: `npm run dev`

## 🪝 Git Hooks

Uses Husky to maintain code quality. Because who doesn't love a good pre-commit sanity check? 🕵️‍♂️

## 🖼️ Icon Generation

Run the icon generation script:
```bash
./scripts/generate-icons.sh
```

**ImageMagick Installation:**
- Mac: `brew install imagemagick`
- Ubuntu/Debian: `sudo apt install imagemagick`
- Windows: Download from ImageMagick's website

## 🔄 Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run tests
5. Push and open a Pull Request

## 📝 Project Structure

```
youtube-adblocker/
├── .husky/                 # Git hooks
├── public/                 # Static assets
│   └── icons/              # Extension icons
├── scripts/                # Utility scripts
├── src/                    # Source code
│   ├── background.ts       # Background script
│   ├── bridge.ts           # Communication bridge
│   ├── content.ts          # DOM manipulation
│   ├── performance.ts      # Performance tracking
│   └── ...
├── manifest.json           # Extension manifest
└── webpack.config.js       # Webpack configuration
```

## ⚠️ Limitations

- YouTube's ad system is a moving target
- Occasional brief ad appearances
- Chrome's `declarativeNetRequest` limited to 5,000 dynamic rules

## 📜 License

MIT License - Free as a bird, open as the internet. 🕊️

## 🙏 Acknowledgements

- `kboghdady/youTube_ads_4_pi-hole` for the domain list
- Chrome Extensions team
- All the awesome contributors

**Disclaimer:** Using ad blockers might violate YouTube's Terms of Service. Use at your own risk! 🤫
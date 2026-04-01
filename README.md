# TrithirBot

Twitch chat bot for Spotify song requests, stream utility commands, and local Piper-based TTS.

## What It Does

- Watches Twitch chat with `tmi.js`
- Adds Spotify tracks from chat messages
- Searches Spotify by `artist - song`
- Reports the currently playing Spotify song
- Clears the secondary Spotify playlist with `!scrub`
- Supports community/counter commands like `!help`, `!discord`, `!lurk`, `!drop`, and `!burp`
- Tracks active lurkers in a transparent startup window
- Generates local TTS with Piper and routes playback through that same lurk window for dedicated Prism capture

## Current Commands

- `!gimme https://open.spotify.com/track/...`
- `!gimmie https://open.spotify.com/track/...`
- `!gimme artist - song`
- `!song`
- `!scrub`
- `!help`
- `!discord`
- `!lurk`
- `!drop`
- `!woops`
- `!burp`
- `!so username`
- `!cc`
- `!tts your message here`
- `!ttsopen`
- `!ttsclose`
- `!ttsmods`
- `!ttssubscribers`
- `!ttscheer`

## Requirements

- Node.js
- npm
- Spotify developer app credentials
- Twitch bot account/token
- Windows PowerShell/WPF for the current local lurk/audio window
- Prism Live Studio app-audio capture if you want to isolate the lurk/TTS window from desktop audio

For local TTS:

- Python in a local `.venv`
- `piper-tts` installed in that `.venv`
- `pathvalidate` installed in that `.venv`
- At least one Piper voice model in `piper/models`

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Create config

Copy `src/config.json.template` to `src/config.json` and fill it out.

Important current values:

- Spotify redirect URI should be `http://127.0.0.1:8000/spotifyAuth`
- TTS uses:
  - `TTS_PYTHON_PATH`
  - `TTS_MODEL_PATH`
  - `TTS_OUTPUT_DIR`

### 3. Spotify app setup

- Create or open your Spotify developer app
- Add this exact redirect URI:

```text
http://127.0.0.1:8000/spotifyAuth
```

If Spotify auth gets weird, delete `spotify-auth-store.json` and authorize again.

### 4. Piper setup

Create and activate a venv, then install Piper:

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install piper-tts pathvalidate
mkdir -p piper/models piper/output
```

Put your Piper voice files in `piper/models`:

- `your-voice.onnx`
- `your-voice.onnx.json`

The bot currently looks in `piper/models` and uses the first `.onnx` model it finds there.

### 5. VS Code convenience

VS Code is configured to prefer the repo’s `.venv` for new terminals:

- `.vscode/settings.json`
- `TrithirBot.code-workspace`

That helps for local Piper work, but the bot itself does not require you to manually activate the venv before `npm start` because it calls the configured Python path directly.

## Running The Bot

From the repo root:

```bash
npm start
```

This still:

1. Builds TypeScript
2. Starts the bot
3. Opens Spotify auth flow if needed
4. Connects to Twitch chat once Spotify is ready

## TTS Notes

The first `!tts` version is intentionally simple:

- Uses local Piper
- Plays through the startup lurk window
- Can be captured in Prism Live Studio as a dedicated app source
- Uses a single playback queue so requests do not overlap
- Is mod-only by default
- Supports mod commands to switch TTS between `open`, `closed`, `mods`, `subscribers`, and `cheer` modes
- Uses a single shared 30-second denial-message cooldown for unauthorized access attempts

Example local Piper test output filename:

- `piper/output/output.wav`

Current defaults live in `src/config.json`:

- `TTS_ENABLED`
- `TTS_PREFIX`
- `TTS_MAX_LENGTH`
- `TTS_USER_COOLDOWN_SECONDS`
- `TTS_GLOBAL_COOLDOWN_SECONDS`
- `TTS_MODE`
- `TTS_DENY_COOLDOWN_SECONDS`
- `TTS_PYTHON_PATH`
- `TTS_MODEL_PATH`
- `TTS_OUTPUT_DIR`

## Notes

- Secrets should not be committed long-term; move them to environment variables later.
- The app currently targets a Windows-local TTS playback flow.
- The roadmap for upcoming work lives in `ROADMAP.md`.

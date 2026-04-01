# Roadmap

## What Changed Today

### Dependency and Security Cleanup

- Updated `nodemon` from the vulnerable 2.x line to `^3.1.10`.
- Refreshed lockfiles so the development dependency vulnerability caused by `simple-update-notifier -> semver` is no longer present.
- Confirmed the project still builds successfully after the dependency update.

### Spotify Authorization Improvements

- Updated the Spotify redirect URI in code to use `http://127.0.0.1:8000/spotifyAuth`.
- Added OAuth `state` generation and validation to the Spotify authorization flow.
- Improved Spotify callback error handling so authorization failures are easier to diagnose.
- Restored and updated `src/config.json.template` so the template reflects the current config shape.

### Project Modularization

- Refactored Twitch chat handling into a modular command system.
- Kept `TwitchService` focused on connection management and command dispatch.
- Extracted commands into dedicated files:
  - `src/commands/request.command.ts`
  - `src/commands/playlist.command.ts`
  - `src/commands/community.command.ts`
  - `src/commands/counter.command.ts`
- Added shared command types and helpers:
  - `src/commands/types.ts`
  - `src/commands/helpers.ts`
  - `src/commands/counter.utils.ts`
  - `src/commands/index.ts`
- Preserved existing command behavior while making future features easier to add.

### First Local TTS Implementation

- Added a first working `!tts` command backed by local Piper generation.
- Added `src/tts.service.ts` to handle request validation, queueing, Piper invocation, and local playback.
- Added TTS config values to `src/config.json` and `src/config.json.template`.
- Updated VS Code workspace settings so the repo `.venv` is easier to use in new terminals.
- Confirmed a successful first live `!tts` test with one user.
- Removed the "TTS queued for ..." success chat message to keep chat less cluttered.
- Added mod commands `!ttsopen` and `!ttsclose` for runtime TTS control.
- Added runtime TTS modes for `open`, `closed`, `mods`, `subscribers`, and `cheer`.
- Added a shared 30-second denial-message cooldown so unauthorized TTS attempts do not spam chat.
- Standardized the local Piper test/example output filename to `output.wav`.

## Current App Shape

The bot currently:

- Connects to Twitch chat using `tmi.js`
- Parses Twitch chat commands
- Adds Spotify tracks to configured playlists
- Searches Spotify by `artist - song`
- Reports the current Spotify song
- Clears the secondary Spotify playlist with `!scrub`
- Handles a small set of community and counter commands
- Supports local Piper-backed `!tts` with runtime access modes and Prism Live Studio desktop-audio playback

The new command architecture makes it much easier to add new features like TTS, moderation helpers, overlays, or game systems without growing one large conditional chain.

## TTS Status

### Why Piper

Piper is a strong candidate for this bot because it is:

- Free to run locally
- Offline, with no API usage costs
- Not rate limited by a cloud provider
- Better sounding than basic built-in OS voices
- Practical for a stream setup where OBS is already running locally

### Current Capabilities

The bot now supports:

- `!tts your message here`
- `!ttsopen`
- `!ttsclose`
- `!ttsmods`
- `!ttssubscribers`
- `!ttscheer`

Current behavior:

- Piper generates audio locally using the repo `.venv`
- The bot uses the first `.onnx` voice model found in `piper/models`
- Audio is played through normal Windows system audio
- Prism Live Studio can capture that desktop/system audio path
- Successful `!tts` requests do not post a confirmation message in chat
- Unauthorized attempts share one global 30-second denial-message cooldown

### Proposed TTS Architecture

#### Command Layer

Add a new command module:

- `src/commands/tts.command.ts`

Responsibilities:

- Detect and parse `!tts ...`
- Enforce message length limits
- Enforce cooldowns
- Optionally restrict usage to moderators/subscribers/VIPs
- Send accepted requests into a local TTS queue

#### TTS Service Layer

Add a local service wrapper, likely something like:

- `src/tts.service.ts`

Responsibilities:

- Invoke Piper through a local executable or script
- Pass sanitized text into Piper
- Write generated audio to a temporary file such as `.wav`
- Manage a playback queue so requests do not overlap
- Expose a clean method such as `speak(text: string): Promise<void>`

#### Audio Playback Layer

Add a small local playback utility, likely something like:

- `src/audio-player.service.ts`

Responsibilities:

- Play the generated audio file locally
- Ensure only one TTS item plays at a time
- Clean up temporary files after playback

Possible implementation paths:

- Use a lightweight local media player invoked from Node
- Use PowerShell or a Windows-native audio path if reliable enough
- Use a dedicated virtual audio device if routing into OBS needs isolation

Chosen first implementation:

- Use local Windows playback through normal desktop/system audio
- Let Prism Live Studio capture that system audio path directly
- Avoid dedicated virtual routing for the first version

#### Prism Live Studio Integration

Prism Live Studio can capture audio from one of these setups:

1. Desktop audio capture
2. A dedicated app audio capture source
3. A virtual cable or isolated output device

Chosen first setup:

- Use the existing default desktop/system audio capture path in Prism Live Studio.

Future upgrade path:

- Move TTS onto a dedicated audio route later if better volume isolation or mix control is needed.

## TTS Rollout Status

### Phase 1: Local Prototype

Goal:

- Prove end-to-end `!tts` command flow locally

Tasks:

- Add `!tts` command module
- Add text sanitization
- Invoke Piper locally with one selected voice
- Save audio to a temp file
- Play audio locally through normal Windows system audio so Prism Live Studio hears it

Success criteria:

- A Twitch chat message like `!tts hello chat` produces audible speech on stream

Current status:

- Complete for the first single-voice local prototype

### Phase 2: Safety and Stream Controls

Goal:

- Make TTS safe enough for normal use during a live stream

Tasks:

- Add per-user cooldowns
- Add global cooldown
- Add max character limit
- Add blocked words/phrase filtering
- Add optional mod-only or trusted-user-only mode
- Add request queueing with clear rejection messages when limits are hit

Success criteria:

- TTS cannot easily be spammed or abused

Current status:

- Mostly complete: per-user cooldown, global cooldown, max length, runtime access modes, denial-message cooldown, and a single playback queue are now implemented

### Phase 3: Configurability

Goal:

- Make the TTS system easy to tune without code changes

Tasks:

- Add config entries for:
  - `TTS_PREFIX`
  - `TTS_ENABLED`
  - `TTS_OPEN_PREFIX`
  - `TTS_CLOSE_PREFIX`
  - `TTS_MODS_PREFIX`
  - `TTS_SUBSCRIBERS_PREFIX`
  - `TTS_CHEER_PREFIX`
  - `TTS_MODE`
  - `TTS_MAX_LENGTH`
  - `TTS_USER_COOLDOWN_SECONDS`
  - `TTS_GLOBAL_COOLDOWN_SECONDS`
  - `TTS_DENY_COOLDOWN_SECONDS`
  - `TTS_PYTHON_PATH`
  - `TTS_MODEL_PATH`
  - `TTS_OUTPUT_DIR`
- Document setup steps in `README.md`

Success criteria:

- TTS behavior can be adjusted through config instead of code edits

Current status:

- Complete for the current single-voice Windows/Prism setup

### Phase 4: Polish

Goal:

- Improve quality of life and stream reliability

Tasks:

- Add queue status messages
- Add command to skip or clear pending TTS
- Add optional voice selection support
- Add blocked-word filtering
- Add logging for accepted and rejected TTS requests
- Add fallback behavior if Piper is unavailable

Success criteria:

- TTS feels stable and maintainable during real stream use

## Proposed Piper Integration Notes

Likely local runtime flow:

1. Chat sends `!tts some message`
2. Bot validates the request
3. Bot calls Piper with the selected voice/model
4. Piper generates a `.wav` file locally
5. Bot plays the `.wav` file
6. Prism Live Studio captures that playback as part of the normal desktop audio path

Potential implementation concerns:

- Piper executable path and model path need to be configurable
- Long messages should be trimmed or rejected
- Playback must be serialized to prevent overlapping speech
- Temporary files should be cleaned up
- The bot should fail gracefully if Piper is missing or misconfigured

## Suggested TTS Defaults

Good initial defaults for a first live-stream-safe version:

- `!tts` enabled only for mods initially
- Max length: 120 characters
- Per-user cooldown: 60 seconds
- Global cooldown: 10 seconds
- Denial-message cooldown: 30 seconds
- Single playback queue
- One default voice only
- Use the existing `.venv` Piper install
- Read the voice model from `piper/models`
- Write generated audio into `piper/output`

## Other Good Future Cleanup

Not for immediate implementation, but worth keeping in mind:

- Move secrets out of `src/config.json` and into environment variables
- Add a `!ttsmode` command so chat/mods can see the current TTS mode
- Add role-based permissions for risky commands like `!scrub`
- Add duplicate song protection
- Add better Spotify link parsing and request validation
- Improve playlist clearing for playlists longer than 55 tracks
- Add tests for message parsing and command dispatch

## General Checklist

General items that still need to be completed or revisited:

- [ ] Move secrets out of `src/config.json` and into environment variables
- [ ] Add tests for message parsing and command dispatch
- [ ] Add duplicate song protection
- [ ] Improve playlist clearing for playlists longer than 55 tracks
- [ ] Add better Spotify link parsing and request validation
- [ ] Add role-based permissions for risky commands like `!scrub`
- [ ] Add a `!ttsmode` command so chat/mods can see the current TTS mode
- [ ] Add blocked-word filtering for TTS
- [ ] Add queue status messages plus skip/clear controls for TTS
- [ ] Add fallback behavior if Piper is unavailable
- [ ] Add `LurkService` and track lurkers in memory
- [ ] Add a local overlay data source for lurk state
- [ ] Build the lurk display UI
- [ ] Decide whether the lurk display should stay browser-source-first or become a standalone window first
- [ ] If we want isolated Prism capture, launch a standalone lurk/audio window on app start
- [ ] Route TTS playback through that standalone window so Prism Live Studio can capture it as a dedicated app source

## Future Feature: On-Screen Lurk Presence

### Goal

When a user types `!lurk`:

- Mark that viewer as currently lurking
- Show a small visual representation of that viewer on stream

When that same user chats again later:

- Remove their lurk state
- Remove their on-screen representation automatically

### High-Level Idea

This would turn `!lurk` into both a chat interaction and a lightweight on-stream presence system.

Examples of possible on-screen representations:

- Username in a themed "lurking" panel
- Small icon or badge with the username
- A fantasy-style token, lantern, skull, campfire marker, or other stream-themed visual
- A simple overlay list of current lurkers

### Proposed Architecture

#### Lurk State Tracking

Add a local state store, likely something like:

- `src/lurk.service.ts`

Responsibilities:

- Track which usernames are currently marked as lurking
- Add a user on `!lurk`
- Remove a user automatically on their next non-command or command chat message
- Expose the current lurker list to an overlay data source

#### Overlay Data Output

Provide a local output that OBS can display, likely through one of these:

1. Local web overlay
2. JSON file written by the bot
3. Small local websocket/http server for real-time updates

Most flexible option:

- A local browser-source overlay that reads lurker state from a tiny HTTP endpoint or websocket feed

Possible files/services:

- `src/overlay.server.ts`
- `overlay/lurkers.html`
- `overlay/lurkers.css`
- `overlay/lurkers.js`

Alternative path for Prism Live Studio app-audio capture:

- Launch a small standalone lurk window when the bot starts
- Let that window render the lurk display and also handle TTS audio playback
- Send lurk-state updates and TTS playback requests into that window through local IPC, websocket, or HTTP
- Use Prism Live Studio app-audio capture on that dedicated window/app instead of relying on general desktop audio

#### Twitch Integration

Behavior proposal:

- `!lurk` adds or refreshes the user in the lurk list
- Any later chat message from that same user removes them from the lurk list
- Optional exception: another `!lurk` message while already lurking simply refreshes their display entry instead of duplicating it

### Proposed Rollout Plan

#### Phase 1: Basic Lurk Tracking

Goal:

- Track lurkers reliably in memory

Tasks:

- Add `LurkService`
- On `!lurk`, save the username as lurking
- On any later message from that user, clear lurking state
- Keep the current chat response behavior intact

Success criteria:

- Users can enter and exit lurk state correctly during a bot session

#### Phase 2: OBS Overlay

Goal:

- Make lurkers visible on stream

Tasks:

- Create a small browser-source-friendly overlay
- Feed it live lurker state from the bot
- Render current lurkers as styled nameplates or tokens

Success criteria:

- OBS can show the active lurker list in real time

#### Phase 2.5: Standalone Lurk And Audio Window

Goal:

- Make the lurk display double as a dedicated TTS playback target for Prism Live Studio

Tasks:

- Add a lightweight local window that launches with the app
- Move lurk rendering into that window
- Route generated TTS playback through that window instead of PowerShell system-audio playback
- Add a small local message bridge between the bot runtime and the window
- Confirm Prism Live Studio can capture that window/app audio as its own source

Success criteria:

- Starting the app also starts a lurk/audio window
- Lurk visuals update there in real time
- TTS plays from that same app/window so Prism Live Studio can capture it as a dedicated source

#### Phase 3: Theming and Polish

Goal:

- Make the feature visually fun and stream-appropriate

Tasks:

- Add entrance/exit animations
- Add stream-themed visuals for each lurker
- Add maximum visible lurker count if needed
- Add optional timestamp or idle duration tracking
- Add command/config options to clear or hide all lurkers

Success criteria:

- The lurk overlay feels intentional and polished, not just functional

### Proposed Config Additions

Possible future config values:

- `LURK_OVERLAY_ENABLED`
- `LURK_OVERLAY_PORT`
- `LURK_MAX_VISIBLE`
- `LURK_REMOVE_ON_ANY_CHAT`
- `LURK_THEME`

### Important Behavior Decision

One detail to confirm before implementation:

- Remove lurk state on any message from the user
- Or remove lurk state only on non-`!lurk` messages

Current preferred behavior:

- Remove lurk state on any subsequent message except a repeated `!lurk`, since that matches the idea of "they are no longer lurking because they spoke again."

## Notes

This roadmap is intentionally focused on documenting today's completed work plus the next likely feature direction. It is not a commitment to implement every item exactly as written, but it should serve as a solid planning baseline for future work.

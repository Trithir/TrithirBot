# Twitch Spotify Request Bot

## What is this?

This is a bot that listens to the chat of a given Twitch stream for messages
with a Spotify song link, or artist - track requests in them, and then adds that song to a playlist and/or
your queue. 

Examples:

✔️ Message that WOULD be picked up:

```
!Sr https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x-_FFgqBRB20mzW_lM7kDQ pls play this, it's a bop

!Sr Reel big fish - trendy

!Sr social distortion-prison bound

```
Note: Artist name and song title must be spelled correctly(I think), and in the proper order. Letter case does not matter.

❌ Message that WOULD NOT be picked up:

```
can you please play this !Sr https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x-_FFgqBRB20mzW_lM7kDQ

```

## Prerequisites

- Some basic programming knowledge (running terminal commands and editing JSON
  files)
- Node (developed and tested on 14.6.0 - your mileage may vary on other versions)
- Yarn (NPM does not work)
- A Spotify account

## Setup

- Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard/)
  and create a new application. The app can have whatever name and description you want
- Once the app is created, click on Edit Settings and add a redirect URL of
  `http://localhost:8000/spotifyAuth` (NB: the port will be whatever you have
  set as the `AUTH_SERVER_PORT` in the `config.json` file, by default it is 8000)
- Run `yarn`
- Create a `src/config.json` file based on `src/config.json.template` file and fill
  in the fields. Everything keeps the quotes except true/falase statements and server port.
  - The playlist ID can be found by right clicking on the playlist ->
    clicking Share -> Copy/Paste the Spotify playlist URL in the code and then copy the ID 
    between `https://open.spotify.com/playlist/` and ?        
      eg. `https://open.spotify.com/playlist/[COPY_THIS_NONSENSE_ONLY]?pm=58g4hj8es4f3g1`)
  - The Spotify client ID and secret are obtained from the application you
    created in the Spotify developer dashboard
- Run `yarn start` in the root directory of the project
- Open the authorization link and give the app the required permissions
- If you have ADD_TO_QUEUE toggled on, ensure you have the Spotify client open and that it is active (i.e. is playing a song)
- Type a Spotify link in the chat (ensuring the link is the first piece of text in the message)
  and make sure it shows up in your desired playlist (Spotify links should start
  with `https://open.spotify.com/track/`)
- If there's a problem with Spotify authorization at any point, try deleting the
  `spotify-auth-store.json` file and starting the app again
  
## Open Source Libraries Used
### [Spotify Web API Node](https://github.com/thelinmichael/spotify-web-api-node)
Used for connecting to and performing actions using Spotify

MIT License

### [tmi.js](https://github.com/tmijs/tmi.js)
Used for connecting to Twitch chat

MIT License

### [Express](https://github.com/expressjs/express)
Used for creating a temporary local web server to retrieve the callback from the Spotify authorization

MIT License

### [Nodemon](https://github.com/remy/nodemon)
Used to speed up development with hot reload

MIT License

### [Prettier](https://github.com/prettier/prettier)
Used to make code pretty

MIT License

### [ts-node](https://github.com/TypeStrong/ts-node)
Used to run TypeScript

MIT License

### [TypeScript](https://www.typescriptlang.org/)
Used for strong typings

Apache 2.0 License

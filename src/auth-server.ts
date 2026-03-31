import express from 'express';
import { AUTH_SERVER_PORT } from './config.json';

type SpotifyAuthCallback = {
  code?: string;
  error?: string;
  state?: string;
};

export const waitForCode = (onCodeReceived: Function) => {
  const app = express();
  const port = AUTH_SERVER_PORT;

  const server = app.listen(port, () => {
    return console.log(`Auth server is listening on ${port}`);
  });

  app.get('/spotifyAuth', (req, res) => {
    const authResult: SpotifyAuthCallback = {
      code:
        typeof req.query.code === 'string' ? req.query.code : undefined,
      error:
        typeof req.query.error === 'string' ? req.query.error : undefined,
      state:
        typeof req.query.state === 'string' ? req.query.state : undefined,
    };

    const responseMessage = authResult.error
      ? `Spotify authorization failed: ${authResult.error}. You can close this window now.`
      : 'Authorization received, you can close this window now.';

    res.send(responseMessage);
    server.close();
    onCodeReceived(authResult);
  });
};

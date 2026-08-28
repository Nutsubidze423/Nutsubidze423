/**
 * One-time helper to get a YouTube refresh token.
 *
 * The consent flow needs a browser and a loopback redirect, so it has to run
 * on your machine — this is the one setup step that cannot be automated.
 * It takes about two minutes.
 *
 *   YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npx tsx scripts/youtube-auth.ts
 */
import { createServer } from 'node:http';
import { google } from 'googleapis';

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
const PORT = 8412;

if (!clientId || !clientSecret) {
  console.error(
    'Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first:\n\n' +
    '  YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npx tsx scripts/youtube-auth.ts\n',
  );
  process.exit(1);
}

const redirectUri = `http://localhost:${PORT}`;
const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const url = auth.generateAuthUrl({
  access_type: 'offline',
  // Without this, Google reissues the existing grant and omits the refresh token.
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
});

const server = createServer(async (req, res) => {
  const code = new URL(req.url ?? '', redirectUri).searchParams.get('code');
  if (!code) { res.end('Waiting for the consent redirect…'); return; }

  try {
    const { tokens } = await auth.getToken(code);
    res.end('Done. You can close this tab and return to the terminal.');
    if (!tokens.refresh_token) {
      console.error('\nNo refresh token returned. Revoke the app at');
      console.error('https://myaccount.google.com/permissions and run this again.');
    } else {
      console.log('\nAdd this as the YOUTUBE_REFRESH_TOKEN secret:\n');
      console.log(tokens.refresh_token + '\n');
    }
  } catch (err) {
    res.end('Token exchange failed — see the terminal.');
    console.error(err);
  }
  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`\nAdd this exact redirect URI to your OAuth client first:\n  ${redirectUri}\n`);
  console.log('Then open:\n');
  console.log(url + '\n');
});

import { createReadStream } from 'node:fs';
import { google } from 'googleapis';
import { config } from '../config.ts';
import type { Meta } from '../packaging/metadata.ts';

function client() {
  const { clientId, clientSecret, refreshToken } = config.youtube();
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth });
}

export type UploadResult = { videoId: string; dryRun: boolean };

export async function upload(videoPath: string, meta: Meta, publishAt?: Date): Promise<UploadResult> {
  if (config.dryRun()) {
    console.log('[DRY RUN] Would upload:', videoPath);
    console.log('[DRY RUN] Title:', meta.title);
    console.log('[DRY RUN] Set DRY_RUN=false to publish for real.');
    return { videoId: 'dry-run', dryRun: true };
  }

  const res = await client().videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        categoryId: '23', // Comedy
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: publishAt ? 'private' : 'public',
        ...(publishAt ? { publishAt: publishAt.toISOString() } : {}),

        // This channel is absurdist meme comedy for teens and adults. It is NOT
        // directed at children, so this stays false. Flipping it to true would
        // disable personalized ads and drop RPM by roughly an order of
        // magnitude — never set it without deciding that deliberately.
        selfDeclaredMadeForKids: false,

        // Required: this pipeline uses synthetic voice and generated imagery.
        // VERIFY THE FIELD NAME against current API docs before first real
        // upload — the disclosure field has moved since it was introduced, and
        // googleapis will silently drop an unknown key rather than error.
        containsSyntheticMedia: true,
      } as never,
    },
    media: { body: createReadStream(videoPath) },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error('Upload succeeded but returned no video id');
  return { videoId, dryRun: false };
}

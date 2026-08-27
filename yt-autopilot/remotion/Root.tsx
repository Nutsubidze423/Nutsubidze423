import React from 'react';
import { Composition } from 'remotion';
import { Short } from './Short.tsx';
import { FPS, WIDTH, HEIGHT, msToFrames } from '../src/config.ts';
import type { RenderProps } from '../src/types.ts';

/** Placeholder props so `npm run studio` opens without a built video.
 *  Real renders pass props from out/<id>/props.json. */
const placeholder: RenderProps = {
  script: {
    ideaId: 'placeholder',
    hook: { text: 'Open the studio to preview a real build', speakerId: null },
    beats: [{ text: 'Run npm run build:one first', speakerId: null, visualCue: '', onScreen: null }],
    payoff: '',
    titleCandidates: ['', '', '', '', ''],
    estimatedSeconds: 0,
  },
  audio: { voicePath: '', durationMs: 3000, words: [], beatFrames: [90], hookFrames: 30 },
  visuals: { images: [] },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    durationInFrames={msToFrames(placeholder.audio.durationMs)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={placeholder}
    // Duration comes from the real audio length, never estimated.
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, msToFrames(props.audio.durationMs)),
    })}
  />
);

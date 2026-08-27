import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme.ts';

/** A visible progress bar measurably helps watch-through on Shorts: it tells
 *  the viewer the payoff is close enough to be worth waiting for. */
export const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: theme.progress.height, background: theme.progress.track }}>
      <div style={{ height: '100%', width: `${(frame / durationInFrames) * 100}%`, background: theme.progress.fill }} />
    </div>
  );
};

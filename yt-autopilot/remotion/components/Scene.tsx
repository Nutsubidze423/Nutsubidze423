import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { theme, outlined } from '../theme.ts';

/** A held still is dead air on Shorts. Every scene gets a slow push-in so the
 *  frame is always moving, which is most of what "edited" means here. */
export const Scene: React.FC<{
  src: string;
  durationInFrames: number;
  onScreen?: string | null;
}> = ({ src, durationInFrames, onScreen }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1.06, 1.18], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={src.startsWith('http') ? src : staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
      {onScreen ? (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: theme.punch.family,
            fontSize: theme.punch.size,
            color: theme.punch.fill,
            textTransform: 'uppercase',
            textAlign: 'center',
            transform: `rotate(-6deg) scale(${interpolate(frame, [0, 6], [0.6, 1], { extrapolateRight: 'clamp' })})`,
            ...outlined(theme.punch.stroke, theme.punch.strokeWidth),
          }}
        >
          {onScreen}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

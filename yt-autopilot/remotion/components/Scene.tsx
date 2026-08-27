import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { theme, outlined } from '../theme.ts';

const src = (p: string) => (p.startsWith('http') || p.startsWith('/') ? p : staticFile(p));

/**
 * Background plus character sprite, composited at render time.
 *
 * Because the sprite is a real layer rather than part of a baked image, it can
 * move: it springs in on the cut and breathes while it talks. That motion is
 * most of what separates this from a slideshow, and it costs nothing.
 */
export const Scene: React.FC<{
  backgroundPath: string;
  spritePath: string | null;
  durationInFrames: number;
  onScreen?: string | null;
}> = ({ backgroundPath, spritePath, durationInFrames, onScreen }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow push on the background so the frame is never static.
  const bgScale = interpolate(frame, [0, durationInFrames], [1.05, 1.16], {
    extrapolateRight: 'clamp',
  });

  // Sprite springs up on the cut, then bobs while the line is delivered.
  const entry = spring({ frame, fps, config: { damping: 14, mass: 0.5 } });
  const bob = Math.sin(frame / 4.5) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={src(backgroundPath)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${bgScale})` }}
      />

      {spritePath ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 620 }}>
          <Img
            src={src(spritePath)}
            style={{
              height: '58%',
              objectFit: 'contain',
              transform: `translateY(${(1 - entry) * 260 + bob}px) scale(${0.9 + entry * 0.1})`,
              filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.55))',
            }}
          />
        </AbsoluteFill>
      ) : null}

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

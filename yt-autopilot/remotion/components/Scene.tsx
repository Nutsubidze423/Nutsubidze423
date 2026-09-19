import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { theme, outlined } from '../theme.ts';
import type { Treatment } from '../treatment.ts';

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
  treatment: Treatment;
}> = ({ backgroundPath, spritePath, durationInFrames, onScreen, treatment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The frame is never static — but which way it moves varies per video.
  const t = (a: number, b: number) =>
    interpolate(frame, [0, durationInFrames], [a, b], { extrapolateRight: 'clamp' });
  const bgScale = treatment.bgMotion === 'out' ? t(1.18, 1.05) : t(1.05, 1.16);
  const bgShift =
    treatment.bgMotion === 'driftLeft' ? t(30, -30)
    : treatment.bgMotion === 'driftRight' ? t(-30, 30)
    : 0;

  const entry = spring({
    frame,
    fps,
    config: treatment.spriteEntry === 'pop'
      ? { damping: 9, mass: 0.35 }
      : { damping: 14, mass: 0.5 },
  });
  const offY = treatment.spriteEntry === 'slide' ? 0 : (1 - entry) * 260;
  const offX = treatment.spriteEntry === 'slide' ? (1 - entry) * -340 : 0;
  const bob = Math.sin(frame / 4.5) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={src(backgroundPath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${bgScale}) translateX(${bgShift}px)`,
        }}
      />

      {spritePath ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 620 }}>
          <Img
            src={src(spritePath)}
            style={{
              height: '58%',
              objectFit: 'contain',
              transform: `translate(${offX}px, ${offY + bob}px) scale(${0.9 + entry * 0.1})`,
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
            color: treatment.accent,
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

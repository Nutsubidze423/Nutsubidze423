import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { WordTiming } from '../../src/types.ts';
import { theme, outlined } from '../theme.ts';

/** Words are grouped into short phrases rather than shown one at a time.
 *  A single word gives the eye nothing to track; 3-4 words reads as speech. */
const GROUP = 3;

export const Captions: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const activeIndex = words.findIndex(w => nowMs >= w.startMs && nowMs < w.endMs);
  if (activeIndex < 0) return null;

  const groupStart = Math.floor(activeIndex / GROUP) * GROUP;
  const group = words.slice(groupStart, groupStart + GROUP);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: theme.caption.bottomInset,
        left: '50%',
        transform: 'translateX(-50%)',
        width: theme.caption.maxWidth,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 18px',
        fontFamily: theme.caption.family,
        fontSize: theme.caption.size,
        lineHeight: theme.caption.lineHeight,
        textTransform: 'uppercase',
        textAlign: 'center',
        ...outlined(theme.caption.stroke, theme.caption.strokeWidth),
      }}
    >
      {group.map((w, i) => {
        const isActive = groupStart + i === activeIndex;
        return (
          <span
            key={`${w.startMs}-${i}`}
            style={{
              color: isActive ? theme.caption.activeFill : theme.caption.fill,
              transform: isActive ? 'scale(1.12)' : 'scale(1)',
              display: 'inline-block',
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};

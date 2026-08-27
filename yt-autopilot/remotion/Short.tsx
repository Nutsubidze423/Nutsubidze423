import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import type { RenderProps } from '../src/types.ts';
import { Scene } from './components/Scene.tsx';
import { Captions } from './components/Captions.tsx';
import { Progress } from './components/Progress.tsx';

export const Short: React.FC<RenderProps> = ({ script, audio, visuals }) => {
  const frameFor = (beatIndex: number) => visuals.frames.find(f => f.beatIndex === beatIndex);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Audio src={audio.voicePath.startsWith('http') ? audio.voicePath : staticFile(audio.voicePath)} />

      <Series>
        <Series.Sequence durationInFrames={audio.hookFrames}>
          <Scene
            backgroundPath={frameFor(0)?.backgroundPath ?? ''}
            spritePath={frameFor(0)?.spritePath ?? null}
            durationInFrames={audio.hookFrames}
            onScreen={null}
          />
        </Series.Sequence>

        {script.beats.map((beat, i) => (
          <Series.Sequence key={i} durationInFrames={audio.beatFrames[i] ?? 1}>
            <Scene
              backgroundPath={frameFor(i + 1)?.backgroundPath ?? ''}
              spritePath={frameFor(i + 1)?.spritePath ?? null}
              durationInFrames={audio.beatFrames[i] ?? 1}
              onScreen={beat.onScreen}
            />
          </Series.Sequence>
        ))}
      </Series>

      {/* Captions and progress sit above every scene, spanning the whole video. */}
      <Captions words={audio.words} />
      <Progress />
    </AbsoluteFill>
  );
};

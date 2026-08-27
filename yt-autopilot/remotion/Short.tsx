import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import type { RenderProps } from '../src/types.ts';
import { Scene } from './components/Scene.tsx';
import { Captions } from './components/Captions.tsx';
import { Progress } from './components/Progress.tsx';

export const Short: React.FC<RenderProps> = ({ script, audio, visuals }) => {
  const imageFor = (beatIndex: number) =>
    visuals.images.find(i => i.beatIndex === beatIndex)?.path ?? '';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Audio src={audio.voicePath.startsWith('http') ? audio.voicePath : staticFile(audio.voicePath)} />

      <Series>
        <Series.Sequence durationInFrames={audio.hookFrames}>
          <Scene src={imageFor(0)} durationInFrames={audio.hookFrames} onScreen={null} />
        </Series.Sequence>

        {script.beats.map((beat, i) => (
          <Series.Sequence key={i} durationInFrames={audio.beatFrames[i] ?? 1}>
            <Scene
              src={imageFor(i + 1)}
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

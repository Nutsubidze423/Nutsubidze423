/** Visual constants. These are the channel's look — change them deliberately,
 *  because a mid-catalogue change makes old and new videos read as two channels. */
export const theme = {
  caption: {
    family: '"Archivo Black", Impact, "Anton", sans-serif',
    size: 96,
    lineHeight: 1.05,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 14,
    /** Colour the currently-spoken word. This is the karaoke effect that
     *  Shorts viewers now read as native — its absence looks unfinished. */
    activeFill: '#ffe14d',
    bottomInset: 480,
    maxWidth: 900,
  },
  punch: {
    family: '"Archivo Black", Impact, sans-serif',
    size: 190,
    fill: '#ffe14d',
    stroke: '#000000',
    strokeWidth: 18,
  },
  progress: {
    height: 10,
    fill: '#ffe14d',
    track: 'rgba(0,0,0,0.35)',
  },
} as const;

export const outlined = (stroke: string, width: number) => ({
  WebkitTextStroke: `${width}px ${stroke}`,
  paintOrder: 'stroke fill' as const,
});

const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export function pcmToWav(pcmBuffers: ArrayBuffer[]): { wav: Blob; durationMs: number } {
  const totalPcmBytes = pcmBuffers.reduce((sum, b) => sum + b.byteLength, 0);
  const header = buildWavHeader(totalPcmBytes);
  const wav = new Blob([header, ...pcmBuffers], { type: 'audio/wav' });
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const totalSamples = totalPcmBytes / bytesPerSample / CHANNELS;
  const durationMs = (totalSamples / SAMPLE_RATE) * 1000;
  return { wav, durationMs };
}

export function pcmDurationMs(pcm: ArrayBuffer): number {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const totalSamples = pcm.byteLength / bytesPerSample / CHANNELS;
  return (totalSamples / SAMPLE_RATE) * 1000;
}

function buildWavHeader(dataSize: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

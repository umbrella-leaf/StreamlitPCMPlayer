/**
 * Writes a string of characters (ASCII) to a DataView on a specific offset.
 * @param view The DataView to which you are going to write.
 * @param offset The start byte where you start typing.
 * @param str The string to be written.
 */
export function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Concatenates multiple ArrayBuffers into one.
 * @param buffers An array of ArrayBuffers to concatenate.
 * @returns A single ArrayBuffer that contains the data for all input buffers.
 */
export function concatArrayBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  // Calculate the total length of all buffers
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);

  // Create a new Uint8Array with the total length
  const result = new Uint8Array(totalLength);

  // Copy the data from each buffer to the new array
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return result.buffer;
}


/**
 * Converts PCM audio data to WAV format.
 */
export function createWavFromPCM(
  pcmBuffer: ArrayBuffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): ArrayBuffer {
  // Obtain the length of the PCM data
  const dataLength = pcmBuffer.byteLength;
  // Creating the WAV File Buffer (44 bytes header + PCM data)
  const buffer = new ArrayBuffer(44 + dataLength);
  // Create a DataView to write the WAV header information
  const view = new DataView(buffer);

  // WAV file header (44 bytes)
  writeString(view, 0, 'RIFF'); // 0-3: RIFF Identifier
  view.setUint32(4, 36 + dataLength, true); // 4-7: File size (36 + data size)
  writeString(view, 8, 'WAVE'); // 8-11: WAVE Identifier
  writeString(view, 12, 'fmt '); // 12-15: Sub-chunk 'fmt' identifier
  view.setUint32(16, 16, true); // 16-19: Size of the sub-chunk 'fmt' (16 bytes)
  view.setUint16(20, 1, true); // 20-21: Audio Format (1 for PCM)
  view.setUint16(22, channels, true); // 22-23: Number of Channels
  view.setUint32(24, sampleRate, true); // 24-27: Sampling Rate
  view.setUint32(28, (sampleRate * channels * bitsPerSample) / 8, true); // 28-31: Tasa de bytes (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, (channels * bitsPerSample) / 8, true); // 32-33: Block Alignment (NumChannels * BitsPerSample/8)
  view.setUint16(34, bitsPerSample, true); // 34-35: Bits per sample
  writeString(view, 36, 'data'); // 36-39: Identifier of the sub-chunk 'data'
  view.setUint32(40, dataLength, true); // 40-43: Sub-chunk 'data' size

  // Copying the PCM data to the WAV file data region (starting at byte 44)
  new Uint8Array(buffer).set(new Uint8Array(pcmBuffer), 44);

  return buffer;
}

// PCM parameters (must match your audio files)
const sampleRate = 16000; // -ar 16k
const channels = 1; // -ac 1
const bitsPerSample = 16; // -f s16le

/**
 * Search for PCM audio fragments from a list of URLs and convert them into a WAV fragment ReadableStream.
 */
export const fetchPCMAudio = (src: string, signal: AbortSignal): ReadableStream<ArrayBuffer> => {
  return new ReadableStream({
    async start(ctrl) {
      try {
        if (signal.aborted) {
          console.log('Aborted fetch.');
          ctrl.close();
          return;
        }
        const audioBinary = atob(src);
        const len = audioBinary.length;
        const audioBytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          audioBytes[i] = audioBinary.charCodeAt(i);
        }
        const arrayBuffer = audioBytes.buffer;
        const buf = createWavFromPCM(arrayBuffer, sampleRate, channels, bitsPerSample);
        ctrl.enqueue(buf);
        ctrl.close();
      } catch (error) {
        console.error("Audio stream error:", error);
        ctrl.error(error);
      }
    },
  });
};
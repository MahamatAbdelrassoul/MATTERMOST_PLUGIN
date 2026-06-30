const waveformCache = new Map<string, Promise<number[]>>();

const DEFAULT_BAR_COUNT = 48;
const MIN_BAR_HEIGHT = 0.14;

function monoSamplePeaks(channelData: Float32Array[], barCount: number): number[] {
    const length = channelData[0]?.length || 0;
    if (length === 0 || barCount <= 0) {
        return Array.from({length: barCount}, () => MIN_BAR_HEIGHT);
    }

    const samplesPerBar = Math.max(1, Math.floor(length / barCount));
    const bars: number[] = [];

    for (let i = 0; i < barCount; i++) {
        const start = i * samplesPerBar;
        const end = i === barCount - 1 ? length : Math.min(start + samplesPerBar, length);
        let peak = 0;

        for (let j = start; j < end; j++) {
            let sample = 0;
            for (let c = 0; c < channelData.length; c++) {
                sample += channelData[c][j] || 0;
            }
            sample /= channelData.length;
            const abs = Math.abs(sample);
            if (abs > peak) {
                peak = abs;
            }
        }

        bars.push(peak);
    }

    const max = Math.max(...bars, 0.001);
    return bars.map((value) => Math.max(MIN_BAR_HEIGHT, value / max));
}

function decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const AudioContextCtor = window.AudioContext
        || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextCtor) {
        return Promise.reject(new Error('Web Audio API is not supported.'));
    }

    const audioContext = new AudioContextCtor();
    return audioContext.decodeAudioData(arrayBuffer.slice(0))
        .then((buffer) => {
            void audioContext.close();
            return buffer;
        })
        .catch((error) => {
            void audioContext.close();
            throw error;
        });
}

function waveformFromAudioBuffer(audioBuffer: AudioBuffer, barCount: number): number[] {
    const channelData: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
    }
    return monoSamplePeaks(channelData, barCount);
}

async function fetchAndDecodeWaveform(url: string, barCount: number): Promise<number[]> {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`Could not load media for waveform (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
        throw new Error('Media file is empty.');
    }

    const audioBuffer = await decodeAudioBuffer(arrayBuffer);
    return waveformFromAudioBuffer(audioBuffer, barCount);
}

export function loadWaveformFromUrl(url: string, barCount = DEFAULT_BAR_COUNT): Promise<number[]> {
    const cacheKey = `${url}:${barCount}`;
    const cached = waveformCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const promise = fetchAndDecodeWaveform(url, barCount);
    waveformCache.set(cacheKey, promise);
    return promise;
}

export function clearWaveformCache(): void {
    waveformCache.clear();
}

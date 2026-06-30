import React from 'react';

import {formatVoiceTime, measureAudioDuration, normalizeDurationSeconds} from './voice_player_utils';
import {loadWaveformFromUrl} from './waveform_utils';

type MediaElement = HTMLAudioElement | HTMLVideoElement;

export function useMediaPlayback(
    mediaRef: React.RefObject<MediaElement | null>,
    mediaUrl: string,
    durationHintSeconds = 0,
    measureDuration = false,
) {
    const [playing, setPlaying] = React.useState(false);
    const [duration, setDuration] = React.useState(() => normalizeDurationSeconds(durationHintSeconds));
    const [current, setCurrent] = React.useState(0);
    const [ready, setReady] = React.useState(durationHintSeconds > 0);

    React.useEffect(() => {
        setDuration(normalizeDurationSeconds(durationHintSeconds));
        setReady(durationHintSeconds > 0);
        setCurrent(0);
        setPlaying(false);
    }, [mediaUrl, durationHintSeconds]);

    React.useEffect(() => {
        const media = mediaRef.current;
        if (!media) {
            return undefined;
        }

        let cancelled = false;

        const onTimeUpdate = () => {
            setCurrent(media.currentTime || 0);
        };

        const onEnded = () => {
            setPlaying(false);
            setCurrent(0);
        };

        const onPause = () => {
            if (media.ended) {
                return;
            }
            setPlaying(false);
        };

        const onPlay = () => {
            setPlaying(true);
        };

        const onLoadedMetadata = () => {
            const measured = normalizeDurationSeconds(media.duration);
            if (measured > 0) {
                setDuration((prev) => (prev > 0 ? prev : measured));
                setReady(true);
            }
        };

        media.addEventListener('timeupdate', onTimeUpdate);
        media.addEventListener('ended', onEnded);
        media.addEventListener('pause', onPause);
        media.addEventListener('play', onPlay);
        media.addEventListener('loadedmetadata', onLoadedMetadata);

        void (async () => {
            if (durationHintSeconds > 0) {
                setReady(true);
                return;
            }

            if (measureDuration && media instanceof HTMLAudioElement) {
                const measured = await measureAudioDuration(media);
                if (cancelled) {
                    return;
                }
                if (measured > 0) {
                    setDuration(measured);
                    setReady(true);
                }
                return;
            }

            const measured = normalizeDurationSeconds(media.duration);
            if (measured > 0) {
                setDuration(measured);
                setReady(true);
            }
        })();

        return () => {
            cancelled = true;
            media.removeEventListener('timeupdate', onTimeUpdate);
            media.removeEventListener('ended', onEnded);
            media.removeEventListener('pause', onPause);
            media.removeEventListener('play', onPlay);
            media.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
    }, [mediaUrl, durationHintSeconds, measureDuration]);

    const totalDuration = duration > 0
        ? duration
        : normalizeDurationSeconds(mediaRef.current?.duration || 0);
    const progress = totalDuration > 0 ? Math.min(1, current / totalDuration) : 0;
    const displaySeconds = (playing || (current > 0 && current < totalDuration))
        ? current
        : totalDuration;

    const togglePlay = React.useCallback(async () => {
        const media = mediaRef.current;
        if (!media) {
            return;
        }

        if (media.paused) {
            if (!ready && totalDuration <= 0 && media instanceof HTMLAudioElement) {
                const measured = await measureAudioDuration(media);
                if (measured > 0) {
                    setDuration(measured);
                    setReady(true);
                }
            }
            try {
                await media.play();
                setPlaying(true);
            } catch {
                setPlaying(false);
            }
        } else {
            media.pause();
            setPlaying(false);
        }
    }, [mediaRef, ready, totalDuration]);

    const seekToRatio = React.useCallback((ratio: number) => {
        const media = mediaRef.current;
        const total = totalDuration > 0
            ? totalDuration
            : normalizeDurationSeconds(media?.duration || 0);
        if (!media || total <= 0) {
            return;
        }

        const clamped = Math.min(1, Math.max(0, ratio));
        media.currentTime = clamped * total;
        setCurrent(media.currentTime);
    }, [mediaRef, totalDuration]);

    return {
        playing,
        current,
        duration: totalDuration,
        progress,
        displaySeconds,
        displayTime: formatVoiceTime(displaySeconds),
        togglePlay,
        seekToRatio,
    };
}

export function useWaveform(mediaUrl: string, barCount = 48) {
    const [bars, setBars] = React.useState<number[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setBars([]);

        void loadWaveformFromUrl(mediaUrl, barCount)
            .then((result) => {
                if (!cancelled) {
                    setBars(result);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setBars(Array.from({length: barCount}, () => 0.2));
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mediaUrl, barCount]);

    return {bars, loading};
}

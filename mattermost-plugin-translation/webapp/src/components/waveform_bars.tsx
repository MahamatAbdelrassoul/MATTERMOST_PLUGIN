import React from 'react';

type Props = {
    bars: number[];
    progress: number;
    onSeek?: (ratio: number, event: React.MouseEvent<HTMLDivElement>) => void;
    className?: string;
    loading?: boolean;
    ariaLabel?: string;
};

export default function WaveformBars({
    bars,
    progress,
    onSeek,
    className = '',
    loading = false,
    ariaLabel = 'Audio waveform',
}: Props) {
    const clampedProgress = Math.min(1, Math.max(0, progress));

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek || loading || bars.length === 0) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        onSeek(ratio, event);
    };

    const displayBars = loading
        ? Array.from({length: 48}, (_, index) => 0.18 + ((index % 5) * 0.05))
        : bars;

    return (
        <div
            className={`translation-waveform ${className}`.trim()}
            onClick={handleClick}
            role={onSeek ? 'slider' : 'presentation'}
            aria-label={ariaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedProgress * 100)}
            tabIndex={onSeek ? 0 : -1}
            onKeyDown={(event) => {
                if (!onSeek || loading) {
                    return;
                }
                if (event.key === 'ArrowRight') {
                    onSeek(Math.min(1, clampedProgress + 0.05), event as unknown as React.MouseEvent<HTMLDivElement>);
                } else if (event.key === 'ArrowLeft') {
                    onSeek(Math.max(0, clampedProgress - 0.05), event as unknown as React.MouseEvent<HTMLDivElement>);
                }
            }}
        >
            {displayBars.map((height, index) => {
                const threshold = (index + 1) / displayBars.length;
                const isPlayed = threshold <= clampedProgress;
                return (
                    <span
                        key={index}
                        className={
                            'translation-waveform__bar' +
                            (isPlayed ? ' translation-waveform__bar--played' : '') +
                            (loading ? ' translation-waveform__bar--loading' : '')
                        }
                        style={{height: `${Math.round(height * 100)}%`}}
                    />
                );
            })}
        </div>
    );
}

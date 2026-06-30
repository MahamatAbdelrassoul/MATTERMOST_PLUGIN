import React from 'react';

import WaveformBars from './waveform_bars';
import {useMediaPlayback, useWaveform} from '../use_media_playback';

type Props = {
    audioUrl: string;
    durationHintSeconds?: number;
};

export default function VoiceNotePlayer({audioUrl, durationHintSeconds = 0}: Props) {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const {bars, loading} = useWaveform(audioUrl, 52);
    const {
        playing,
        progress,
        displayTime,
        togglePlay,
        seekToRatio,
    } = useMediaPlayback(audioRef, audioUrl, durationHintSeconds, true);

    return (
        <div className='translation-voice-player'>
            <audio
                ref={audioRef}
                preload='metadata'
                src={audioUrl}
            />
            <button
                type='button'
                className='translation-voice-player__play'
                onClick={() => void togglePlay()}
                aria-label={playing ? 'Pause voice message' : 'Play voice message'}
            >
                {playing ? '❚❚' : '▶'}
            </button>
            <WaveformBars
                bars={bars}
                loading={loading}
                progress={progress}
                onSeek={(ratio) => seekToRatio(ratio)}
                className='translation-voice-player__waveform'
                ariaLabel='Voice message waveform'
            />
            <span
                className='translation-voice-player__time'
                aria-live='polite'
            >
                {displayTime}
            </span>
        </div>
    );
}

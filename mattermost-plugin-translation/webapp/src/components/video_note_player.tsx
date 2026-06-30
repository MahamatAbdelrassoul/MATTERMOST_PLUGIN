import React from 'react';

import WaveformBars from './waveform_bars';
import {useMediaPlayback, useWaveform} from '../use_media_playback';

type Props = {
    videoUrl: string;
    durationHintSeconds?: number;
};

export default function VideoNotePlayer({videoUrl, durationHintSeconds = 0}: Props) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const {bars, loading} = useWaveform(videoUrl, 44);
    const {
        playing,
        progress,
        displayTime,
        togglePlay,
        seekToRatio,
    } = useMediaPlayback(videoRef, videoUrl, durationHintSeconds);

    return (
        <div className='translation-video-player translation-video-player--bubble'>
            <div
                className={
                    'translation-video-player__frame' +
                    (playing ? ' translation-video-player__frame--playing' : '')
                }
            >
                <video
                    ref={videoRef}
                    className='translation-video-player__video'
                    preload='metadata'
                    playsInline
                    src={videoUrl}
                    onClick={() => void togglePlay()}
                />
                {!playing && (
                    <button
                        type='button'
                        className='translation-video-player__overlay-play'
                        onClick={() => void togglePlay()}
                        aria-label='Play video message'
                    >
                        <span className='translation-video-player__overlay-icon'>▶</span>
                    </button>
                )}
                <div className='translation-video-player__duration-badge'>
                    {displayTime}
                </div>
            </div>
            <div className='translation-video-player__controls'>
                <button
                    type='button'
                    className='translation-video-player__play'
                    onClick={() => void togglePlay()}
                    aria-label={playing ? 'Pause video message' : 'Play video message'}
                >
                    {playing ? '❚❚' : '▶'}
                </button>
                <WaveformBars
                    bars={bars}
                    loading={loading}
                    progress={progress}
                    onSeek={(ratio) => seekToRatio(ratio)}
                    className='translation-video-player__waveform'
                    ariaLabel='Video message audio waveform'
                />
                <span
                    className='translation-video-player__time'
                    aria-live='polite'
                >
                    {displayTime}
                </span>
            </div>
        </div>
    );
}

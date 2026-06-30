import React from 'react';

import type {FileInfo} from '@mattermost/types/files';
import type {Post} from '@mattermost/types/posts';

import VideoNotePlayer from './video_note_player';
import {durationSecondsFromMs} from '../voice_player_utils';
import {getVideoDurationMs, isVideoFileInfo} from '../video_post_utils';

type Props = {
    fileInfo: FileInfo;
    post?: Post;
    onModalDismissed?: () => void;
};

export default function VideoNotePreview({fileInfo, post, onModalDismissed}: Props) {
    const isVideo = isVideoFileInfo(fileInfo);
    const videoUrl = isVideo ? `/api/v4/files/${fileInfo.id}` : '';
    const durationHintSeconds = post ? durationSecondsFromMs(getVideoDurationMs(post)) : 0;

    if (!isVideo) {
        return null;
    }

    return (
        <div className='translation-video-preview translation-video-preview--modal'>
            <VideoNotePlayer
                videoUrl={videoUrl}
                durationHintSeconds={durationHintSeconds}
            />
            {onModalDismissed && (
                <button
                    type='button'
                    className='translation-voice-panel__action'
                    onClick={onModalDismissed}
                >
                    Close
                </button>
            )}
        </div>
    );
}

import React from 'react';

import VoiceNoteButton from './voice_note_button';
import VideoNoteButton from './video_note_button';

type MediaDraft = {
    channelId: string;
    rootId?: string;
    message?: string;
};

type Props = {
    draft: MediaDraft;
    getSelectedText?: () => {start?: number | null; end?: number | null};
    updateText?: (message: string) => void;
};

export default function MediaNoteButtons(props: Props) {
    return (
        <span className='translation-media-note-buttons'>
            <VoiceNoteButton {...props} />
            <VideoNoteButton {...props} />
        </span>
    );
}

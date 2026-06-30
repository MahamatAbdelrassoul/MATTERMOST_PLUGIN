import React from 'react';

import type {FileInfo} from '@mattermost/types/files';
import type {Post} from '@mattermost/types/posts';

import VideoNotePreview from './video_note_preview';
import VoiceNotePreview from './voice_note_preview';
import {isVoiceFileInfo, shouldOverrideVoicePreview} from '../voice_post_utils';
import {isVideoFileInfo, shouldOverrideVideoPreview} from '../video_post_utils';

type Props = {
    fileInfo: FileInfo;
    post?: Post;
    onModalDismissed?: () => void;
};

export function shouldOverrideMediaPreview(fileInfo: FileInfo, post?: Post): boolean {
    return shouldOverrideVoicePreview(fileInfo, post) || shouldOverrideVideoPreview(fileInfo, post);
}

export default function MediaFilePreview(props: Props) {
    if (isVideoFileInfo(props.fileInfo) || props.post?.type === 'custom_video_note') {
        return <VideoNotePreview {...props} />;
    }
    if (isVoiceFileInfo(props.fileInfo) || props.post?.type === 'custom_voice_note') {
        return <VoiceNotePreview {...props} />;
    }
    return null;
}

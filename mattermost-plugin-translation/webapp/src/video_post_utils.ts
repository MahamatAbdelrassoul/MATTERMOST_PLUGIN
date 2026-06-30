import type {FileInfo} from '@mattermost/types/files';
import type {Post} from '@mattermost/types/posts';

export function isVideoFileInfo(file: FileInfo): boolean {
    if (file.name?.startsWith('video-note-')) {
        return true;
    }
    const videoExtensions = ['webm', 'mp4', 'mov', 'm4v'];
    return Boolean(
        file.mime_type?.startsWith('video/') &&
        videoExtensions.includes((file.extension || '').toLowerCase()),
    );
}

export function isVideoNotePost(post: Post | null | undefined): boolean {
    if (!post) {
        return false;
    }
    if (post.type === 'custom_video_note') {
        return true;
    }
    if (post.props?.video_note) {
        return true;
    }

    const files = post.metadata?.files || [];
    if (files.some(isVideoFileInfo)) {
        return true;
    }

    return false;
}

export function getVideoDurationMs(post: Post): number | undefined {
    const fromProps = post.props?.video_duration_ms;
    if (typeof fromProps === 'number' && fromProps > 0) {
        return fromProps;
    }
    if (typeof fromProps === 'string') {
        const parsed = Number(fromProps);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return undefined;
}

export function getVideoFileId(post: Post): string | undefined {
    const fromProps = typeof post.props?.video_file_id === 'string'
        ? post.props.video_file_id.trim()
        : '';
    if (fromProps) {
        return fromProps;
    }
    const files = post.metadata?.files || [];
    const videoFile = files.find(isVideoFileInfo);
    if (videoFile?.id) {
        return videoFile.id;
    }
    return undefined;
}

export function getVideoTranscript(post: Post): string {
    const fromProps = typeof post.props?.video_transcript === 'string'
        ? post.props.video_transcript.trim()
        : '';
    if (fromProps) {
        return fromProps;
    }

    const message = post.message?.trim() || '';
    if (!message || message.toLowerCase() === 'video message') {
        return '';
    }
    return message;
}

export function shouldOverrideVideoPreview(fileInfo: FileInfo, post?: Post): boolean {
    if (isVideoFileInfo(fileInfo)) {
        return true;
    }
    return Boolean(post && isVideoNotePost(post));
}

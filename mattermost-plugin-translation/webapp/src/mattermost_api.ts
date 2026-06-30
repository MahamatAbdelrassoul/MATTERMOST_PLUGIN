type FileUploadResponse = {
    file_infos?: Array<{id: string}>;
};

type CreatePostResponse = {
    id: string;
};

async function parseError(response: Response): Promise<string> {
    try {
        const data = await response.json() as {message?: string; id?: string};
        return data.message || data.id || `Request failed (${response.status})`;
    } catch {
        return `Request failed (${response.status})`;
    }
}

export async function uploadChannelFile(channelId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('channel_id', channelId);
    formData.append('files', file, file.name);

    const response = await fetch('/api/v4/files', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    const data = await response.json() as FileUploadResponse;
    const fileId = data.file_infos?.[0]?.id;
    if (!fileId) {
        throw new Error('File upload did not return a file id.');
    }

    return fileId;
}

export async function createVoicePost(params: {
    channelId: string;
    rootId?: string;
    fileId: string;
    transcript: string;
    durationMs?: number;
    speakingLanguage?: string;
}): Promise<CreatePostResponse> {
    const transcript = params.transcript.trim();
    const props: Record<string, unknown> = {
        voice_note: true,
        voice_transcript: transcript,
        voice_file_id: params.fileId,
    };

    if (params.durationMs && params.durationMs > 0) {
        props.voice_duration_ms = Math.round(params.durationMs);
    }
    if (params.speakingLanguage?.trim()) {
        props.voice_language = params.speakingLanguage.trim();
    }

    const response = await fetch('/api/v4/posts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            type: 'custom_voice_note',
            channel_id: params.channelId,
            root_id: params.rootId || '',
            message: '',
            props,
        }),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    return response.json() as Promise<CreatePostResponse>;
}

export async function createVideoPost(params: {
    channelId: string;
    rootId?: string;
    fileId: string;
    transcript: string;
    durationMs?: number;
    speakingLanguage?: string;
}): Promise<CreatePostResponse> {
    const transcript = params.transcript.trim();
    const props: Record<string, unknown> = {
        video_note: true,
        video_transcript: transcript,
        video_file_id: params.fileId,
    };

    if (params.durationMs && params.durationMs > 0) {
        props.video_duration_ms = Math.round(params.durationMs);
    }
    if (params.speakingLanguage?.trim()) {
        props.video_language = params.speakingLanguage.trim();
    }

    const response = await fetch('/api/v4/posts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            type: 'custom_video_note',
            channel_id: params.channelId,
            root_id: params.rootId || '',
            message: '',
            props,
        }),
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    return response.json() as Promise<CreatePostResponse>;
}

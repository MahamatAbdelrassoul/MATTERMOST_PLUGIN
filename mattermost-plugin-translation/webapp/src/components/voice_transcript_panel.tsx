import React, {useCallback} from 'react';
import {connect, useStore} from 'react-redux';
import type {Post} from '@mattermost/types/posts';
import type {GlobalState} from '@mattermost/types/store';

import {getPluginState, type TranslationRecord} from '../reducer';
import {requestPostTranslation} from '../translation_client';
import {getVoiceTranscript, isVoiceNotePost} from '../voice_post_utils';

type OwnProps = {
    post?: Post;
};

type StateProps = {
    record?: TranslationRecord;
    isReader: boolean;
};

function extractPost(props: OwnProps & Partial<Post>): Post | null {
    if (props.post?.id) {
        return props.post;
    }
    if (props.id) {
        return props as Post;
    }
    return null;
}

function VoiceTranscriptPanelInner({
    post: postProp,
    record,
    isReader,
    ...rest
}: OwnProps & StateProps & Partial<Post>) {
    const store = useStore<GlobalState>();
    const post = extractPost({post: postProp, ...rest});

    const handleTranslate = useCallback(() => {
        if (!post) {
            return;
        }
        const text = getVoiceTranscript(post);
        void requestPostTranslation(store.dispatch, post.id, text, false);
    }, [post, store]);

    if (!post || !isVoiceNotePost(post) || !isReader) {
        return null;
    }

    const hasTranslation = Boolean(record?.translated && !record.sameLanguage);
    const transcript = getVoiceTranscript(post);

    if (record?.sameLanguage) {
        const text = record.translated || record.origin || transcript;
        if (text) {
            return (
                <div className='translation-panel translation-voice-panel'>
                    <div className='translation-panel__meta'>Already in your language</div>
                    <div className='translation-panel__text'>{text}</div>
                </div>
            );
        }
    }

    if (record?.loading) {
        return (
            <div className='translation-panel translation-voice-panel'>
                <span className='translation-panel__meta'>Translating…</span>
            </div>
        );
    }

    if (record?.error) {
        return (
            <div className='translation-panel translation-voice-panel translation-panel--error'>
                <button
                    type='button'
                    className='translation-panel__action'
                    onClick={handleTranslate}
                >
                    Translate to text
                </button>
                <div className='translation-panel__error'>{record.error}</div>
            </div>
        );
    }

    if (!hasTranslation) {
        return (
            <div className='translation-panel translation-voice-panel'>
                <button
                    type='button'
                    className='translation-panel__action'
                    onClick={handleTranslate}
                >
                    Translate to text
                </button>
            </div>
        );
    }

    return (
        <div className='translation-panel translation-voice-panel'>
            <div className='translation-panel__text'>{record?.translated}</div>
        </div>
    );
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps & Partial<Post>): StateProps {
    const post = extractPost(ownProps);
    const pluginState = getPluginState(state as Record<string, unknown>);
    const currentUserId = state.entities?.users?.currentUserId || '';

    if (!post) {
        return {isReader: false};
    }

    return {
        record: pluginState.byPostId[post.id],
        isReader: Boolean(currentUserId && post.user_id !== currentUserId),
    };
}

export default connect(mapStateToProps)(VoiceTranscriptPanelInner);

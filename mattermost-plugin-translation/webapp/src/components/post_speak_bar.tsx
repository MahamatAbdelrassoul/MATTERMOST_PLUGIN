import React from 'react';
import {connect} from 'react-redux';
import type {Post} from '@mattermost/types/posts';
import type {GlobalState} from '@mattermost/types/store';

import SpeakButton from './speak_button';
import {isVideoNotePost} from '../video_post_utils';
import {isVoiceNotePost} from '../voice_post_utils';

type Props = {
    post: Post;
    currentUserId?: string;
};

function PostSpeakBarInner({post, currentUserId}: Props) {
    if (!post?.id) {
        return null;
    }

    const isAuthor = Boolean(currentUserId && post.user_id === currentUserId);
    const isMedia = isVoiceNotePost(post) || isVideoNotePost(post);

    if (isMedia && isAuthor) {
        return null;
    }

    const hasText = Boolean(post.message?.trim());
    if (!hasText && !isMedia) {
        return null;
    }

    return (
        <div className='translation-speak-bar'>
            <SpeakButton postId={post.id} />
        </div>
    );
}

function mapStateToProps(state: GlobalState, ownProps: {post: Post}) {
    return {
        currentUserId: state.entities?.users?.currentUserId || '',
        post: ownProps.post,
    };
}

export default connect(mapStateToProps)(PostSpeakBarInner);

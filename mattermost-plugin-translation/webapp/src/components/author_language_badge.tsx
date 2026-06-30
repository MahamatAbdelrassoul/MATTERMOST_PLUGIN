import React from 'react';
import {connect} from 'react-redux';
import type {Post} from '@mattermost/types/posts';

import {getPluginState, getUserReceiveLanguage} from '../reducer';
import {languageCodeLabel, languageShortCode} from '../language_labels';

type Props = {
    post?: Post;
    language?: string;
} & Partial<Post>;

function extractPost(props: Props): Post | null {
    if (props.post?.id) {
        return props.post;
    }
    if (props.id && props.user_id) {
        return props as Post;
    }
    return null;
}

function AuthorLanguageBadge({post: postProp, language, ...rest}: Props) {
    const post = extractPost({post: postProp, language, ...rest});
    if (!post?.user_id || !language) {
        return null;
    }

    return (
        <div className='translation-author-badge'>
            <span
                className='translation-author-badge__pill'
                title={`${languageCodeLabel(language)} receive language`}
            >
                {languageShortCode(language)}
            </span>
            <span className='translation-author-badge__label'>receive language</span>
        </div>
    );
}

function mapStateToProps(state: Record<string, unknown>, ownProps: Props) {
    const post = extractPost(ownProps);
    if (!post?.user_id) {
        return {};
    }
    const pluginState = getPluginState(state);
    return {
        language: getUserReceiveLanguage(pluginState, post.user_id),
    };
}

export default connect(mapStateToProps)(AuthorLanguageBadge);

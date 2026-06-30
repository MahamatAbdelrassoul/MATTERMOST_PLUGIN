import React from 'react';

import {connect} from 'react-redux';

import type {Post} from '@mattermost/types/posts';

import type {GlobalState} from '@mattermost/types/store';



import {getPluginState, shouldShowTranslationBar, type TranslationRecord} from '../reducer';

import {toggleShowOriginal} from '../post_refresh';



type OwnProps = {

    post?: Post;

};



type StateProps = {

    record?: TranslationRecord;

    showOriginal: boolean;

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



function TranslationAttachment({post: postProp, record, showOriginal, isReader, ...rest}: OwnProps & StateProps & Partial<Post>) {

    const post = extractPost({post: postProp, ...rest});

    if (!post || !record || !isReader) {

        return null;

    }



    const state = {byPostId: {[post.id]: record}, showOriginalByPostId: {[post.id]: showOriginal}} as ReturnType<typeof getPluginState>;

    if (!shouldShowTranslationBar(post, state)) {

        return null;

    }



    if (record.loading) {

        return (

            <div className='translation-panel translation-attachment'>

                <span className='translation-panel__meta'>Translating…</span>

            </div>

        );

    }



    if (record.error) {

        return (

            <div className='translation-panel translation-attachment translation-panel--error'>

                <div className='translation-panel__error'>{record.error}</div>

            </div>

        );

    }



    if (record.sameLanguage || !record.translated) {

        return null;

    }



    return (

        <div className='translation-panel translation-attachment'>

            <div className='translation-panel__header'>

                <button

                    type='button'

                    className='translation-panel__link'

                    onClick={() => toggleShowOriginal(post.id)}

                >

                    {showOriginal ? 'Show translation' : 'Show original'}

                </button>

            </div>

            {showOriginal && (

                <div className='translation-panel__text'>

                    {record.origin || post.message}

                </div>

            )}

        </div>

    );

}



function mapStateToProps(state: GlobalState, ownProps: OwnProps & Partial<Post>): StateProps {

    const post = extractPost(ownProps);

    const pluginState = getPluginState(state as Record<string, unknown>);

    const currentUserId = state.entities?.users?.currentUserId || '';



    if (!post) {

        return {showOriginal: false, isReader: false};

    }



    return {

        record: pluginState.byPostId[post.id],

        showOriginal: Boolean(pluginState.showOriginalByPostId[post.id]),

        isReader: Boolean(currentUserId && post.user_id !== currentUserId),

    };

}



export default connect(mapStateToProps)(TranslationAttachment);


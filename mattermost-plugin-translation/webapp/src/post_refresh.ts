import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import {receivedNewPost} from 'mattermost-redux/actions/posts';

import {getPost} from 'mattermost-redux/selectors/entities/posts';

import {isCollapsedThreadsEnabled} from 'mattermost-redux/selectors/entities/preferences';



let storeRef: Store<GlobalState> | null = null;



export function bindTranslationStore(store: Store<GlobalState>) {

    storeRef = store;

}



export function refreshPostsInUI(store: Store<GlobalState>, postIds: string[]) {

    const state = store.getState();

    const crtEnabled = isCollapsedThreadsEnabled(state);



    for (const postId of postIds) {

        const post = getPost(state, postId);

        if (post) {

            store.dispatch(receivedNewPost(post, crtEnabled));

        }

    }

}


import React from 'react';
import type {Store} from 'redux';
import type {GlobalState} from '@mattermost/types/store';

const POST_LIST_ROOTS = [
    '#post-list',
    '#channel_view .post-list__dynamic',
    '.post-list__content',
];

function getPostListRoot(): Element | null {
    for (const selector of POST_LIST_ROOTS) {
        const el = document.querySelector(selector);
        if (el) {
            return el;
        }
    }
    return null;
}

export function tagWhatsAppPosts(store: Store<GlobalState>): void {
    const state = store.getState();
    const currentUserId = state.entities?.users?.currentUserId;
    if (!currentUserId) {
        return;
    }

    const posts = state.entities?.posts?.posts || {};
    const root = getPostListRoot() || document.body;

    root.querySelectorAll('.post').forEach((node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        if (node.classList.contains('post--system')) {
            node.classList.remove('translation-wa--sent', 'translation-wa--received');
            return;
        }

        const postId = node.id?.startsWith('post_') ? node.id.slice(5) : node.id;
        if (!postId) {
            return;
        }

        const post = posts[postId];
        if (!post?.user_id) {
            return;
        }

        const isSent = post.user_id === currentUserId;
        node.classList.toggle('translation-wa--sent', isSent);
        node.classList.toggle('translation-wa--received', !isSent);
    });
}

type Props = {
    getStore: () => Store<GlobalState> | null;
};

export default function WhatsAppChatLayout({getStore}: Props) {
    React.useEffect(() => {
        document.body.classList.add('translation-wa-chat');

        let rafId = 0;
        let observer: MutationObserver | null = null;

        const scheduleTag = () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            rafId = requestAnimationFrame(() => {
                const store = getStore();
                if (store) {
                    tagWhatsAppPosts(store);
                }
            });
        };

        const attachObserver = () => {
            const root = getPostListRoot();
            if (!root) {
                return false;
            }
            if (observer) {
                observer.disconnect();
            }
            observer = new MutationObserver(scheduleTag);
            observer.observe(root, {childList: true, subtree: true});
            return true;
        };

        scheduleTag();

        const store = getStore();
        const unsubscribe = store?.subscribe(scheduleTag);

        const retry = window.setInterval(() => {
            scheduleTag();
            attachObserver();
        }, 800);

        attachObserver();

        return () => {
            document.body.classList.remove('translation-wa-chat');
            window.clearInterval(retry);
            unsubscribe?.();
            observer?.disconnect();
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [getStore]);

    return null;
}

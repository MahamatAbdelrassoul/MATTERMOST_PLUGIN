import React from 'react';
import {createPortal} from 'react-dom';

import TranslationHeaderIcon from './translation_header_icon';

const SLOT_ID = 'plugin-translation-header-slot';

const ANCHOR_SELECTORS = [
    'button[aria-label="Pinned messages"]',
    'button[aria-label="Pinned posts"]',
    'button[aria-label="View Info"]',
    'button[aria-label="Open channel information"]',
    '#channelHeaderInfoButton',
    '#channelHeaderPinButton',
];

type Props = {
    onOpen: () => void;
};

function findHeaderAnchor(): Element | null {
    for (const selector of ANCHOR_SELECTORS) {
        const match = document.querySelector(selector);
        if (match) {
            return match;
        }
    }

    return document.querySelector('.channel-header__icons')?.firstElementChild || null;
}

export default function ChannelHeaderTranslateMount({onOpen}: Props) {
    const [slot, setSlot] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        const mount = () => {
            const existing = document.getElementById(SLOT_ID);
            if (existing) {
                setSlot(existing);
                return;
            }

            const anchor = findHeaderAnchor();
            const parent = anchor?.parentElement;
            if (!anchor || !parent) {
                return;
            }

            const element = document.createElement('span');
            element.id = SLOT_ID;
            element.className = 'plugin-translation-header-slot';
            parent.insertBefore(element, anchor);
            setSlot(element);
        };

        mount();
        const observer = new MutationObserver(mount);
        observer.observe(document.body, {childList: true, subtree: true});

        return () => {
            observer.disconnect();
            document.getElementById(SLOT_ID)?.remove();
            setSlot(null);
        };
    }, []);

    if (!slot) {
        return null;
    }

    return createPortal(
        <button
            type='button'
            className='plugin-translation-header-btn'
            onClick={onOpen}
            title='Translation languages — receive language, read-aloud voice, channel members'
            aria-label='Translation languages'
        >
            <TranslationHeaderIcon size={18} />
        </button>,
        slot,
    );
}

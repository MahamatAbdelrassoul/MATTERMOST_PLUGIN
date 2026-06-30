import React from 'react';

type Props = {
    size?: number;
    active?: boolean;
};

export default function SpeakerIcon({size = 18, active = false}: Props) {
    const fill = active
        ? 'var(--button-bg, #166de0)'
        : 'rgba(var(--center-channel-color-rgb, 63, 67, 80), 0.64)';

    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            aria-hidden='true'
            focusable='false'
        >
            <path
                fill={fill}
                d='M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77Zm-2 2.42L7.41 9H4v6h3.41l4.59 3.35V5.65ZM7 12c0-1.1.9-2 2-2V8.28c-2.01.46-3.5 2.27-3.5 4.47S6.99 16.29 9 16.72V14c-1.1 0-2-.9-2-2Z'
            />
        </svg>
    );
}

import React from 'react';

type Props = {
    size?: number;
    active?: boolean;
};

export default function MicrophoneIcon({size = 18, active = false}: Props) {
    const circleFill = active ? 'var(--dnd-indicator, #d24b4e)' : 'rgba(var(--center-channel-color-rgb, 63, 67, 80), 0.12)';
    const micFill = active ? '#fff' : 'rgba(var(--center-channel-color-rgb, 63, 67, 80), 0.72)';

    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            aria-hidden='true'
            focusable='false'
        >
            <circle
                cx='12'
                cy='12'
                r='11'
                fill={circleFill}
            />
            <path
                fill={micFill}
                d='M12 6.25a2.25 2.25 0 0 1 2.25 2.25v3.5A2.25 2.25 0 0 1 12 14.25 2.25 2.25 0 0 1 9.75 12V8.5A2.25 2.25 0 0 1 12 6.25Zm-4.25 5.75a4.25 4.25 0 0 0 8.5 0h1.25a5.5 5.5 0 0 1-4.75 5.45V19h2v1.25H9.75V19h2v-1.55A5.5 5.5 0 0 1 7 12h1.25Z'
            />
        </svg>
    );
}

import React from 'react';

type Props = {
    size?: number;
    active?: boolean;
};

export default function VideoIcon({size = 18, active = false}: Props) {
    const circleFill = active ? 'var(--dnd-indicator, #d24b4e)' : 'rgba(var(--center-channel-color-rgb, 63, 67, 80), 0.12)';
    const iconFill = active ? '#fff' : 'rgba(var(--center-channel-color-rgb, 63, 67, 80), 0.72)';

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
                fill={iconFill}
                d='M9.25 7.75A1.75 1.75 0 0 0 7.5 9.5v5a1.75 1.75 0 0 0 1.75 1.75h4.5A1.75 1.75 0 0 0 15.5 14.5v-5A1.75 1.75 0 0 0 13.75 7.75h-4.5Zm6.1 1.35 3.15-1.9A.9.9 0 0 1 20 7.95v8.1a.9.9 0 0 1-1.4.75l-3.15-1.9V9.1Z'
            />
        </svg>
    );
}

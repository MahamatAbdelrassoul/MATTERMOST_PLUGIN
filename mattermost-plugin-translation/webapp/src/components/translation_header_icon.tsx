import React from 'react';

type Props = {
    size?: number;
};

/** Standard translate glyph (globe + characters) for channel header. */
export default function TranslationHeaderIcon({size = 18}: Props) {
    return (
        <span
            className='translation-header-icon'
            aria-hidden='true'
        >
            <svg
                width={size}
                height={size}
                viewBox='0 0 24 24'
                fill='currentColor'
                xmlns='http://www.w3.org/2000/svg'
            >
                <path d='M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2v.01C4.54 10.97 6.96 14.09 10.07 15.65l-1.79 1.83 1.41 1.41L12 16.58l2.5 2.41.87-.89-1.41-1.41z'/>
                <path d='M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'/>
            </svg>
        </span>
    );
}

import React from 'react';

export type PreviewData = {
    origin: string;
    translated: string;
    detectedFrom: string;
    to: string;
    score: number;
    qualityScore?: number;
    embeddingScore?: number;
    slangExpanded?: boolean;
    normalizedText?: string;
};

type Props = {
    preview: PreviewData;
    onConfirm: () => void;
    onCancel: () => void;
};

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    fr: 'French',
    ja: 'Japanese',
    lg: 'Luganda',
    ln: 'Lingala',
    sw: 'Swahili',
    de: 'German',
    es: 'Spanish',
    co: 'Corsican',
};

function languageLabel(code: string): string {
    const normalized = code.trim().toLowerCase().split(/[-_]/)[0];
    return LANGUAGE_NAMES[normalized] || code;
}

export default function TranslatePreviewModal({preview, onConfirm, onCancel}: Props) {
    const qualityPct = Math.round((preview.qualityScore ?? preview.score) * 100);
    const aiPct = preview.embeddingScore != null ? Math.round(preview.embeddingScore * 100) : null;

    return (
        <div className='translation-preview-overlay' role='dialog' aria-modal='true'>
            <div className='translation-preview-modal'>
                <h3 className='translation-preview-modal__title'>How others will see your message</h3>
                <p className='translation-preview-modal__hint'>
                    Detected {languageLabel(preview.detectedFrom)} → preview in {languageLabel(preview.to)}
                    {' '}(AI quality {qualityPct}%
                    {aiPct != null ? ` · semantic ${aiPct}%` : ''})
                </p>
                {preview.slangExpanded && preview.normalizedText && (
                    <p className='translation-preview-modal__hint'>
                        Expanded chat shorthand: <strong>{preview.normalizedText}</strong>
                    </p>
                )}
                <div className='translation-preview-modal__block'>
                    <div className='translation-preview-modal__label'>Recipients see</div>
                    <div className='translation-preview-modal__text'>{preview.translated}</div>
                </div>
                <div className='translation-preview-modal__block translation-preview-modal__block--muted'>
                    <div className='translation-preview-modal__label'>Your original</div>
                    <div className='translation-preview-modal__text'>{preview.origin}</div>
                </div>
                <div className='translation-preview-modal__actions'>
                    <button
                        type='button'
                        className='btn btn-tertiary'
                        onClick={onCancel}
                    >
                        Edit message
                    </button>
                    <button
                        type='button'
                        className='btn btn-primary'
                        onClick={onConfirm}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

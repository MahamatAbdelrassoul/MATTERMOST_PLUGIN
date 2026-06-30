import React from 'react';

export type VoiceGender = 'male' | 'female' | 'neutral';

type Props = {
    value: VoiceGender;
    disabled?: boolean;
    className?: string;
    onChange: (value: VoiceGender) => void;
};

const OPTIONS: Array<{value: VoiceGender; label: string}> = [
    {value: 'neutral', label: 'Neutral (Google default)'},
    {value: 'female', label: 'Female'},
    {value: 'male', label: 'Male'},
];

export default function VoiceGenderSelect({value, disabled, className = '', onChange}: Props) {
    return (
        <select
            className={`translation-voice-gender-select ${className}`.trim()}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value as VoiceGender)}
            aria-label='Read-aloud voice'
        >
            {OPTIONS.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                >
                    {option.label}
                </option>
            ))}
        </select>
    );
}

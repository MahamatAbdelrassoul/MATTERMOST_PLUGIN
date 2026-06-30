const displayNames = typeof Intl !== 'undefined'
    ? new Intl.DisplayNames(['en'], {type: 'language'})
    : null;

export function languageShortCode(code: string): string {
    const normalized = (code || '').trim();
    if (!normalized) {
        return '?';
    }
    return normalized.toUpperCase().slice(0, 2);
}

export function languageCodeLabel(code: string): string {
    const normalized = (code || '').trim();
    if (!normalized) {
        return 'Unknown';
    }

    if (displayNames) {
        const label = displayNames.of(normalized);
        if (label && label !== normalized) {
            return label;
        }
    }

    switch (normalized.toLowerCase()) {
    case 'ja': return 'Japanese';
    case 'lg': return 'Luganda';
    case 'en': return 'English';
    case 'fr': return 'French';
  default: return normalized;
    }
}

export function languageFlag(code: string): string {
    const normalized = (code || '').trim().toLowerCase();
    switch (normalized) {
    case 'ja': return '🇯🇵';
    case 'lg': return '🇺🇬';
    case 'en': return '🇬🇧';
    case 'fr': return '🇫🇷';
    case 'sw': return '🇰🇪';
    default: return '🌐';
    }
}

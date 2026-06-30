export function formatVoiceTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }

    const whole = Math.floor(seconds);
    const mins = Math.floor(whole / 60);
    const secs = whole % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function normalizeDurationSeconds(value: number): number {
    if (!Number.isFinite(value) || value <= 0 || value === Infinity) {
        return 0;
    }
    return value;
}

export function durationSecondsFromMs(durationMs?: number): number {
    if (!durationMs || durationMs <= 0) {
        return 0;
    }
    return durationMs / 1000;
}

export function measureAudioDuration(audio: HTMLAudioElement): Promise<number> {
    const existing = normalizeDurationSeconds(audio.duration);
    if (existing > 0) {
        return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
        let settled = false;

        const finish = (seconds: number) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            try {
                audio.currentTime = 0;
            } catch {
                // ignore
            }
            resolve(normalizeDurationSeconds(seconds));
        };

        const checkDuration = () => {
            const measured = normalizeDurationSeconds(audio.duration);
            if (measured > 0) {
                finish(measured);
            }
        };

        const onTimeUpdate = () => {
            checkDuration();
            if (audio.currentTime > 0 && normalizeDurationSeconds(audio.duration) > 0) {
                finish(audio.duration);
            }
        };

        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', checkDuration);
            audio.removeEventListener('durationchange', checkDuration);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            clearTimeout(timeoutId);
        };

        audio.addEventListener('loadedmetadata', checkDuration);
        audio.addEventListener('durationchange', checkDuration);
        audio.addEventListener('timeupdate', onTimeUpdate);

        try {
            audio.load();
            audio.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
            finish(0);
            return;
        }

        const timeoutId = window.setTimeout(() => finish(0), 4000);
        checkDuration();
    });
}

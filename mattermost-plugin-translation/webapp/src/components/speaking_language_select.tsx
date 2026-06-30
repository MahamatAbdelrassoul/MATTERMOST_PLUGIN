import {useSelector} from 'react-redux';
import type {GlobalState} from '@mattermost/types/store';

import {getPluginState} from '../reducer';

/** Receive language from Account Settings → Translation (not used as voice STT hint). */
export function useDefaultSpeakingLanguage(): string {
    return useSelector((state: GlobalState) => {
        const pluginState = getPluginState(state as Record<string, unknown>);
        return pluginState.targetLanguage || 'en';
    });
}

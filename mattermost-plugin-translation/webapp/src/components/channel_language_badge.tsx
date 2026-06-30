import React from 'react';
import {connect} from 'react-redux';
import type {GlobalState} from '@mattermost/types/store';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {getMyReceiveLanguage, getPluginState} from '../reducer';
import {languageCodeLabel, languageShortCode} from '../language_labels';

type Props = {
    receiveLanguage: string;
};

function ChannelLanguageBadge({receiveLanguage}: Props) {
    const code = languageShortCode(receiveLanguage);

    return (
        <span
            className='translation-channel-badge'
            title={`You receive messages in ${languageCodeLabel(receiveLanguage)}`}
        >
            Receive: {code}
        </span>
    );
}

function mapStateToProps(state: GlobalState) {
    const pluginState = getPluginState(state as Record<string, unknown>);
    const currentUserId = getCurrentUserId(state) || '';
    return {
        receiveLanguage: getMyReceiveLanguage(pluginState, currentUserId),
    };
}

export default connect(mapStateToProps)(ChannelLanguageBadge);

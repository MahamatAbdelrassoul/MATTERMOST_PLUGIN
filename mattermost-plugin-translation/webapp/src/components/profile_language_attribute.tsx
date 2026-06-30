import React from 'react';
import {connect} from 'react-redux';
import type {UserProfile} from '@mattermost/types/users';
import type {GlobalState} from '@mattermost/types/store';

import {getPluginState, getUserReceiveLanguage} from '../reducer';
import {languageCodeLabel, languageFlag, languageShortCode} from '../language_labels';

type Props = {
    user?: UserProfile;
    language?: string;
};

type State = {
    fetchedLanguage: string;
    loading: boolean;
};

const API_BASE = '/plugins/com.transchecker.translation/api/v1';

class ProfileLanguageAttribute extends React.PureComponent<Props, State> {
    state: State = {
        fetchedLanguage: '',
        loading: false,
    };

    componentDidMount() {
        void this.ensureLanguage();
    }

    componentDidUpdate(prevProps: Props) {
        if (prevProps.user?.id !== this.props.user?.id || prevProps.language !== this.props.language) {
            void this.ensureLanguage();
        }
    }

    ensureLanguage = async () => {
        const {user, language} = this.props;
        if (!user?.id || language) {
            return;
        }

        this.setState({loading: true});
        try {
            const response = await fetch(
                `${API_BASE}/user-language?user_id=${encodeURIComponent(user.id)}`,
                {
                    credentials: 'same-origin',
                    headers: {'X-Requested-With': 'XMLHttpRequest'},
                },
            );
            if (response.ok) {
                const data = await response.json() as {target_language: string};
                this.setState({fetchedLanguage: data.target_language, loading: false});
            } else {
                this.setState({loading: false});
            }
        } catch {
            this.setState({loading: false});
        }
    };

    render() {
        const {user} = this.props;
        const language = this.props.language || this.state.fetchedLanguage;

        if (!user?.id) {
            return null;
        }

        if (this.state.loading && !language) {
            return (
                <div className='translation-profile-attr'>
                    <span className='translation-profile-attr__label'>Receive language</span>
                    <span className='translation-profile-attr__value'>Loading…</span>
                </div>
            );
        }

        if (!language) {
            return null;
        }

        return (
            <div className='translation-profile-attr'>
                <span className='translation-profile-attr__label'>Receive language</span>
                <span className='translation-profile-attr__value'>
                    {languageFlag(language)} {languageShortCode(language)} · {languageCodeLabel(language)}
                </span>
            </div>
        );
    }
}

function mapStateToProps(state: GlobalState, ownProps: Props) {
    const userId = ownProps.user?.id;
    if (!userId) {
        return {};
    }
    return {
        language: getUserReceiveLanguage(getPluginState(state as Record<string, unknown>), userId),
    };
}

export default connect(mapStateToProps)(ProfileLanguageAttribute);

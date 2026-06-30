import React from 'react';

import type {FileInfo} from '@mattermost/types/files';

import type {Post} from '@mattermost/types/posts';



import VoiceNotePlayer from './voice_note_player';

import {getVoiceDurationMs, isVoiceFileInfo} from '../voice_post_utils';
import {durationSecondsFromMs} from '../voice_player_utils';



type Props = {

    fileInfo: FileInfo;

    post?: Post;

    onModalDismissed?: () => void;

};



export default function VoiceNotePreview({fileInfo, post, onModalDismissed}: Props) {

    const isVoice = isVoiceFileInfo(fileInfo);

    const audioUrl = isVoice ? `/api/v4/files/${fileInfo.id}` : '';

    const durationHintSeconds = post ? durationSecondsFromMs(getVoiceDurationMs(post)) : 0;



    if (!isVoice) {

        return null;

    }



    return (

        <div className='translation-voice-preview translation-voice-preview--modal'>

            <VoiceNotePlayer

                audioUrl={audioUrl}

                durationHintSeconds={durationHintSeconds}

            />

            {onModalDismissed && (

                <button

                    type='button'

                    className='translation-voice-panel__action'

                    onClick={onModalDismissed}

                >

                    Close

                </button>

            )}

        </div>

    );

}


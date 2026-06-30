import React from 'react';
import type {PluginCustomSettingComponent} from 'types/mattermost-webapp';

import LanguageSelect from './language_select';

const ReceiveLanguageSetting: PluginCustomSettingComponent = ({informChange}) => {
  const [value, setValue] = React.useState('en');

  React.useEffect(() => {
    void fetch('/plugins/com.transchecker.translation/api/v1/language', {
      credentials: 'same-origin',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {target_language?: string} | null) => {
        if (data?.target_language) {
          setValue(data.target_language);
        }
      })
      .catch(() => {
        // keep default
      });
  }, []);

  return (
    <div className='translation-receive-language-setting'>
      <LanguageSelect
        value={value}
        onChange={(language) => {
          setValue(language);
          informChange('target_language', language);
        }}
      />
    </div>
  );
};

export default ReceiveLanguageSetting;

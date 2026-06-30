package main

import (
	"github.com/mattermost/mattermost/server/public/model"
)

func (p *Plugin) publishLanguagePreferenceChanged(userID, lang string) {
	payload := map[string]interface{}{
		"user_id":         userID,
		"target_language": lang,
	}

	if user, appErr := p.API.GetUser(userID); appErr == nil && user != nil {
		payload["username"] = user.Username
		payload["display_name"] = user.GetDisplayName(model.ShowNicknameFullName)
	}

	p.API.PublishWebSocketEvent("language_preference_changed", payload, &model.WebsocketBroadcast{})
}

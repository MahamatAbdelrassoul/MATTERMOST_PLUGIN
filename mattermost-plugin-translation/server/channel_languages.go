package main

import (
	"encoding/json"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
)

type channelMemberLanguage struct {
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
	DisplayName    string `json:"display_name"`
	TargetLanguage string `json:"target_language"`
}

func (p *Plugin) handleChannelLanguages(w http.ResponseWriter, r *http.Request) {
	channelID := r.URL.Query().Get("channel_id")
	if channelID == "" {
		http.Error(w, "channel_id is required", http.StatusBadRequest)
		return
	}

	userIDs := p.getChannelMemberUserIDs(channelID)
	members := make([]channelMemberLanguage, 0, len(userIDs))

	for _, userID := range userIDs {
		user, appErr := p.API.GetUser(userID)
		if appErr != nil {
			continue
		}

		members = append(members, channelMemberLanguage{
			UserID:         userID,
			Username:       user.Username,
			DisplayName:    user.GetDisplayName(model.ShowNicknameFullName),
			TargetLanguage: p.getUserTargetLanguage(userID),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"members": members,
	})
}

func (p *Plugin) handleGetUserPublicLanguage(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	lang := p.getUserTargetLanguage(userID)
	response := map[string]interface{}{
		"user_id":         userID,
		"target_language": lang,
	}

	if user, appErr := p.API.GetUser(userID); appErr == nil && user != nil {
		response["username"] = user.Username
		response["display_name"] = user.GetDisplayName(model.ShowNicknameFullName)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(response)
}

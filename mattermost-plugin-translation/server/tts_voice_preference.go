package main

import (
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
)

const ttsVoiceGenderPreferenceName = "tts_voice_gender"

func normalizeTTSVoiceGender(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "male":
		return "male"
	case "female":
		return "female"
	default:
		return "neutral"
	}
}

func googleTTSGenderCode(value string) string {
	switch normalizeTTSVoiceGender(value) {
	case "male":
		return "MALE"
	case "female":
		return "FEMALE"
	default:
		return "NEUTRAL"
	}
}

func (p *Plugin) getUserTTSVoiceGender(userID string) string {
	if pref, appErr := p.API.GetPreferenceForUser(userID, pluginPreferenceCategory, ttsVoiceGenderPreferenceName); appErr == nil && pref.Value != "" {
		return normalizeTTSVoiceGender(pref.Value)
	}

	key := "tts_voice_" + userID
	if data, err := p.API.KVGet(key); err == nil && len(data) > 0 {
		return normalizeTTSVoiceGender(string(data))
	}

	return "neutral"
}

func (p *Plugin) setUserTTSVoiceGender(userID, gender string) error {
	gender = normalizeTTSVoiceGender(gender)

	pref := model.Preference{
		UserId:   userID,
		Category: pluginPreferenceCategory,
		Name:     ttsVoiceGenderPreferenceName,
		Value:    gender,
	}

	if appErr := p.API.UpdatePreferencesForUser(userID, []model.Preference{pref}); appErr != nil {
		p.API.LogError("Failed to save TTS voice preference", "error", appErr.Error(), "user_id", userID, "gender", gender)
		return appErr
	}

	if err := p.API.KVSet("tts_voice_"+userID, []byte(gender)); err != nil {
		p.API.LogWarn("Saved TTS voice preference but KV backup failed", "error", err.Error())
	}

	return nil
}

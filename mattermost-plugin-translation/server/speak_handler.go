package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
)

type speakAPIRequest struct {
	PostID string `json:"post_id"`
}

func (p *Plugin) resolveSpeakableTextForUser(post *model.Post, userID string) (string, string, error) {
	if post == nil {
		return "", "", fmt.Errorf("post not found")
	}

	targetLang := p.getUserTargetLanguage(userID)

	if post.UserId == userID {
		if isMediaNotePost(post) {
			return "", "", fmt.Errorf("use the media player for your own recording")
		}
		text := strings.TrimSpace(post.Message)
		if text == "" {
			return "", "", fmt.Errorf("no text to read")
		}
		if result, _, err := p.translateWithCache(text, "", targetLang, p.getUserTargetLanguage(post.UserId)); err == nil {
			lang := normalizeLangCode(result.DetectedFrom)
			if lang != "" {
				return text, lang, nil
			}
		}
		return text, targetLang, nil
	}

	text := strings.TrimSpace(post.Message)
	if isMediaNotePost(post) {
		text = mediaTranscriptFromPost(post)
		if isPlaceholderMediaText(text, post) {
			transcribed, err := p.transcribeMediaPost(post)
			if err != nil {
				return "", "", fmt.Errorf("could not transcribe media: %w", err)
			}
			text = strings.TrimSpace(transcribed)
			if text != "" {
				p.saveMediaTranscript(post, text)
			}
		}
	}

	if text == "" {
		return "", "", fmt.Errorf("no text available to read")
	}

	result, _, err := p.translateWithCache(text, "", targetLang, p.getUserTargetLanguage(post.UserId))
	if err != nil {
		return "", "", err
	}

	if isSameLanguage(result.DetectedFrom, targetLang) {
		return text, targetLang, nil
	}

	spoken := strings.TrimSpace(result.Translated)
	if spoken == "" {
		return text, targetLang, nil
	}

	return spoken, targetLang, nil
}

func (p *Plugin) callSynthesizeAPI(ctx context.Context, text, language, voiceGender string) ([]byte, error) {
	config := p.getConfiguration()
	baseURL := strings.TrimRight(config.TranslationAPIURL, "/")

	body, err := json.Marshal(map[string]string{
		"text":         text,
		"language":     language,
		"voice_gender": googleTTSGenderCode(voiceGender),
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/synthesize", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", config.TranslationAPIKey)

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("speech API unreachable: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := strings.TrimSpace(string(respBody))
		if msg == "" {
			return nil, fmt.Errorf("speech API error: HTTP %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("%s", msg)
	}

	return respBody, nil
}

func friendlySynthesisError(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "Speech synthesis is unavailable."
	}

	var parsed struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil && strings.TrimSpace(parsed.Error) != "" {
		raw = strings.TrimSpace(parsed.Error)
	}

	lower := strings.ToLower(raw)
	if strings.Contains(lower, "texttospeech") && (strings.Contains(lower, "disabled") || strings.Contains(lower, "blocked") || strings.Contains(lower, "not been used")) {
		return "Google Text-to-Speech is not enabled for your API key. Enable Cloud Text-to-Speech in Google Cloud Console."
	}
	if strings.Contains(lower, "api key") {
		return "Google Text-to-Speech rejected the API key."
	}

	if len(raw) > 180 {
		return raw[:180] + "…"
	}
	return raw
}

func (p *Plugin) handleSpeakResolve(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var req speakAPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	postID := strings.TrimSpace(req.PostID)
	if postID == "" {
		http.Error(w, "post_id is required", http.StatusBadRequest)
		return
	}

	post, appErr := p.API.GetPost(postID)
	if appErr != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	text, language, err := p.resolveSpeakableTextForUser(post, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"text":           text,
		"language":       language,
		"voice_gender":   p.getUserTTSVoiceGender(userID),
	})
}

func (p *Plugin) handleSpeak(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var req speakAPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	postID := strings.TrimSpace(req.PostID)
	if postID == "" {
		http.Error(w, "post_id is required", http.StatusBadRequest)
		return
	}

	post, appErr := p.API.GetPost(postID)
	if appErr != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	text, language, err := p.resolveSpeakableTextForUser(post, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	audio, err := p.callSynthesizeAPI(ctx, text, language, p.getUserTTSVoiceGender(userID))
	if err != nil {
		p.API.LogWarn("Speech synthesis failed", "post_id", postID, "error", err.Error())
		http.Error(w, friendlySynthesisError(err.Error()), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "private, max-age=3600")
	_, _ = w.Write(audio)
}

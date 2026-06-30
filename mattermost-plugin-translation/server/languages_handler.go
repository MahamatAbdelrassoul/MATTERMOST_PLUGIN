package main

import (
	"io"
	"net/http"
	"strings"
	"time"
)

func (p *Plugin) handleLanguages(w http.ResponseWriter, r *http.Request) {
	config := p.getConfiguration()
	baseURL := strings.TrimRight(config.TranslationAPIURL, "/")

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, baseURL+"/languages", nil)
	if err != nil {
		http.Error(w, "failed to create languages request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("X-API-Key", config.TranslationAPIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "translation API unreachable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read languages response", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(body)
}

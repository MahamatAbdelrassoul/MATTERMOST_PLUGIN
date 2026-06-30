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
)

type TranslationResult struct {
	Origin         string  `json:"origin"`
	To             string  `json:"to"`
	From           string  `json:"from"`
	DetectedFrom   string  `json:"detected_from"`
	Translated     string  `json:"translated"`
	Engine         string  `json:"engine"`
	Reversed       string  `json:"reversed"`
	Score          float64 `json:"score"`
	SemanticScore  float64 `json:"semantic_score"`
	EmbeddingScore float64 `json:"embedding_score"`
	QualityScore   float64 `json:"quality_score"`
}

type translateRequestBody struct {
	Text         string `json:"text"`
	To           string `json:"to"`
	From         string `json:"from,omitempty"`
	HintLanguage string `json:"hint_language,omitempty"`
	Fast         bool   `json:"fast,omitempty"`
}

func (p *Plugin) callTranslationAPI(ctx context.Context, text, to, from, hintLanguage string, fast bool) (*TranslationResult, error) {
	config := p.getConfiguration()

	body, err := json.Marshal(translateRequestBody{
		Text:         text,
		To:           to,
		From:         from,
		HintLanguage: hintLanguage,
		Fast:         fast,
	})
	if err != nil {
		return nil, err
	}

	baseURL := strings.TrimRight(config.TranslationAPIURL, "/")
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/translate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", config.TranslationAPIKey)

	timeout := 60 * time.Second
	if fast {
		timeout = 120 * time.Second
	}

	client := &http.Client{Timeout: timeout}
	resp, err := p.doHTTPWithRetry(client, req, 2)
	if err != nil {
		return nil, fmt.Errorf("translation API unreachable: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("translation API rejected the API key")
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("translation API quota exceeded")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(respBody, &apiErr)
		if apiErr.Error != "" {
			return nil, fmt.Errorf("translation API error: %s", apiErr.Error)
		}
		return nil, fmt.Errorf("translation API error: HTTP %d", resp.StatusCode)
	}

	var result TranslationResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func (p *Plugin) doHTTPWithRetry(client *http.Client, req *http.Request, retries int) (*http.Response, error) {
	var lastErr error
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}

	for attempt := 0; attempt <= retries; attempt++ {
		reqCopy := req.Clone(req.Context())
		reqCopy.Body = io.NopCloser(bytes.NewReader(bodyBytes))

		resp, err := client.Do(reqCopy)
		if err == nil && resp.StatusCode < 500 {
			return resp, nil
		}

		if resp != nil {
			if resp.StatusCode < 500 {
				return resp, nil
			}
			_ = resp.Body.Close()
		}

		lastErr = err
		if attempt < retries {
			time.Sleep(time.Duration(700*(attempt+1)) * time.Millisecond)
		}
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("translation API request failed after retries")
}

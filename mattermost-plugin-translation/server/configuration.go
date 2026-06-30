package main

import (
	"reflect"
	"strings"

	"github.com/pkg/errors"
)

type configuration struct {
	TranslationAPIURL         string
	TranslationAPIKey         string
	DefaultTargetLanguage     string
	CacheTTLHours             int
	EnableAutoTranslate       bool
	EnablePreTranslatePreview bool
	STTApiURL                 string
	STTApiKey                 string
}

func (c *configuration) Clone() *configuration {
	clone := *c
	return &clone
}

func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{
			TranslationAPIURL:         "http://host.docker.internal:5000",
			TranslationAPIKey:         "dev-transchecker-key-change-in-production",
			DefaultTargetLanguage:     "en",
			CacheTTLHours:             168,
			EnableAutoTranslate:       true,
			EnablePreTranslatePreview: true,
		}
	}

	return p.configuration
}

func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		if reflect.ValueOf(*configuration).NumField() == 0 {
			return
		}

		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	if configuration.TranslationAPIURL == "" {
		configuration.TranslationAPIURL = "http://host.docker.internal:5000"
	}
	if configuration.TranslationAPIKey == "" {
		configuration.TranslationAPIKey = "dev-transchecker-key-change-in-production"
	}
	if configuration.DefaultTargetLanguage == "" {
		configuration.DefaultTargetLanguage = "en"
	}
	if configuration.CacheTTLHours <= 0 {
		configuration.CacheTTLHours = 168
	}
	if strings.TrimSpace(configuration.STTApiURL) == "" {
		configuration.STTApiURL = configuration.TranslationAPIURL
	}
	if strings.TrimSpace(configuration.STTApiKey) == "" {
		configuration.STTApiKey = configuration.TranslationAPIKey
	}

	p.setConfiguration(configuration)

	return nil
}

func (p *Plugin) isAutoTranslateEnabled() bool {
	config := p.getConfiguration()
	if raw := p.API.GetPluginConfig(); raw != nil {
		if _, ok := raw["EnableAutoTranslate"]; !ok {
			return true
		}
	}
	return config.EnableAutoTranslate
}

func (p *Plugin) isPreTranslatePreviewEnabled() bool {
	config := p.getConfiguration()
	if raw := p.API.GetPluginConfig(); raw != nil {
		if _, ok := raw["EnablePreTranslatePreview"]; !ok {
			return true
		}
	}
	return config.EnablePreTranslatePreview
}

package command

import (
	"fmt"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

type Handler struct {
	client *pluginapi.Client
	plugin PluginAPI
}

type PluginAPI interface {
	SetUserLanguage(userID, lang string) error
	GetUserLanguage(userID string) string
	TranslateMessage(userID, postID, text, to string) (string, error)
}

type Command interface {
	Handle(args *model.CommandArgs) (*model.CommandResponse, error)
}

const (
	langCommandTrigger      = "translation-lang"
	translateCommandTrigger = "translate"
)

func NewCommandHandler(client *pluginapi.Client, plugin PluginAPI) Command {
	commands := []*model.Command{
		{
			Trigger:          langCommandTrigger,
			AutoComplete:     true,
			AutoCompleteDesc: "Set your translation target language",
			AutoCompleteHint: "[ja|lg|en|fr]",
			AutocompleteData: model.NewAutocompleteData(langCommandTrigger, "[ja|lg|en|fr]", "Language code: ja, lg, en, fr"),
		},
		{
			Trigger:          translateCommandTrigger,
			AutoComplete:     true,
			AutoCompleteDesc: "Translate the message above in a thread, or provide text",
			AutoCompleteHint: "[text]",
			AutocompleteData: model.NewAutocompleteData(translateCommandTrigger, "[text]", "Optional text to translate"),
		},
	}

	for _, cmd := range commands {
		if err := client.SlashCommand.Register(cmd); err != nil {
			client.Log.Error("Failed to register command", "trigger", cmd.Trigger, "error", err)
		}
	}

	return &Handler{client: client, plugin: plugin}
}

func (c *Handler) Handle(args *model.CommandArgs) (*model.CommandResponse, error) {
	fields := strings.Fields(args.Command)
	if len(fields) == 0 {
		return ephemeral("Empty command"), nil
	}

	trigger := strings.TrimPrefix(fields[0], "/")
	switch trigger {
	case langCommandTrigger:
		return c.handleLangCommand(args, fields)
	case translateCommandTrigger:
		return c.handleTranslateCommand(args, fields)
	default:
		return ephemeral(fmt.Sprintf("Unknown command: %s", args.Command)), nil
	}
}

func isSupportedLanguage(lang string) bool {
	switch lang {
	case "ja", "lg", "en", "fr":
		return true
	default:
		return false
	}
}

func (c *Handler) handleLangCommand(args *model.CommandArgs, fields []string) (*model.CommandResponse, error) {
	if len(fields) < 2 {
		current := c.plugin.GetUserLanguage(args.UserId)
		return ephemeral(fmt.Sprintf("Current target language: **%s**\n\nUsage: `/translation-lang ja` (options: ja, lg, en, fr)", current)), nil
	}

	lang := strings.ToLower(fields[1])
	if !isSupportedLanguage(lang) {
		return ephemeral("Unsupported language. Use: ja, lg, en, fr"), nil
	}

	if err := c.plugin.SetUserLanguage(args.UserId, lang); err != nil {
		return ephemeral(fmt.Sprintf("Failed to save language preference: %s", err.Error())), nil
	}

	return ephemeral(fmt.Sprintf("Target language set to **%s**.", lang)), nil
}

func (c *Handler) handleTranslateCommand(args *model.CommandArgs, fields []string) (*model.CommandResponse, error) {
	text := strings.TrimSpace(strings.TrimPrefix(args.Command, "/"+translateCommandTrigger))
	to := c.plugin.GetUserLanguage(args.UserId)

	if len(fields) >= 3 && isSupportedLanguage(strings.ToLower(fields[1])) {
		to = strings.ToLower(fields[1])
		text = strings.TrimSpace(strings.Join(fields[2:], " "))
	}

	if text == "" && args.RootId != "" {
		root, appErr := c.client.Post.GetPost(args.RootId)
		if appErr != nil {
			return ephemeral("Could not load the message to translate."), nil
		}
		text = strings.TrimSpace(root.Message)
	}

	if text == "" {
		return ephemeral("Usage:\n- `/translate Hello world`\n- `/translate lg Hello world` (translate to Luganda once)\n- `/translation-lang lg` (set default language)\n- Reply in a thread to a message and run `/translate`"), nil
	}

	result, err := c.plugin.TranslateMessage(args.UserId, args.RootId, text, to)
	if err != nil {
		return ephemeral(fmt.Sprintf("Translation failed: %s", err.Error())), nil
	}

	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeInChannel,
		Text:         result,
	}, nil
}

func ephemeral(text string) *model.CommandResponse {
	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         text,
	}
}

# Makefile — atalhos para a pipeline de ciencia (Instagram).
# Rode `make` ou `make help` para a lista completa.
#
# Variaveis (passe na linha de comando):
#   SLOT=0|1            slot do dia (0 = manha/default, 1 = tarde)
#   THEME="Buracos negros"  tema custom (ignora a rotacao; aspas se tiver espaco)
#   STAMP=2026-06-14-1  pasta em output/ para republicar
#   TOKEN=EAAB...       short-lived token para `make auth-token`
#
# Exemplos:
#   make today                      gera midia local (sem publicar)
#   make publish SLOT=1             publica o slot da tarde
#   make publish THEME="Vulcoes"    publica um tema custom
#   make republish STAMP=2026-06-14-1   republica midia ja gerada

.DEFAULT_GOAL := help

# Monta as flags opcionais a partir das variaveis.
SLOT_FLAG  := $(if $(SLOT),--slot $(SLOT),)
THEME_FLAG := $(if $(THEME),--theme "$(THEME)",)
FLAGS      := $(SLOT_FLAG) $(THEME_FLAG)

# Unidades systemd --user da automacao.
TIMERS  := instagram-ciencia@0.timer instagram-ciencia@1.timer instagram-ciencia-refresh.timer
SERVICE := instagram-ciencia@$(or $(SLOT),0).service

.PHONY: help install today publish republish auth auth-token refresh-token \
        typecheck check clean timers logs trigger enable disable

help: ## Mostra esta ajuda
	@echo "Pipeline de ciencia -> Instagram. Alvos disponiveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Variaveis: SLOT=0|1  THEME=\"texto\"  STAMP=<pasta>  TOKEN=<short token>"
	@echo "Ex.: make publish SLOT=1 THEME=\"Buracos negros\""

install: ## Instala deps npm (precisa de ffmpeg no PATH a parte)
	npm install

today: ## Gera a midia localmente, SEM publicar (output/<data>-<slot>/)
	npm run today -- $(FLAGS)

publish: ## Gera E publica no Instagram (carrossel + Reel + Story + Facebook)
	npm run publish -- $(FLAGS)

republish: ## Republica midia JA gerada que falhou no publish (precisa STAMP=)
	@test -n "$(STAMP)" || { echo "Erro: defina STAMP, ex.: make republish STAMP=2026-06-14-1"; exit 1; }
	npm run republish -- $(STAMP)

auth: ## Helper de token Meta/Instagram (imprime os passos de setup)
	npm run auth

auth-token: ## Troca short token por long-lived e lista IG_USER_ID (precisa TOKEN=)
	@test -n "$(TOKEN)" || { echo "Erro: defina TOKEN, ex.: make auth-token TOKEN=EAAB..."; exit 1; }
	npm run auth -- --token $(TOKEN)

refresh-token: ## Renova IG_ACCESS_TOKEN in-place no .env
	npm run refresh-token

typecheck: ## tsc --noEmit
	npm run typecheck

check: typecheck ## Alias de typecheck

clean: ## Remove a midia local gerada (output/)
	rm -rf output/*

timers: ## Status dos timers systemd --user da automacao
	systemctl --user list-timers 'instagram-ciencia*' --no-pager

logs: ## Logs do ultimo run (use SLOT=0|1; default 0)
	journalctl --user -u $(SERVICE) -n 80 --no-pager

trigger: ## Dispara um run manual agora via systemd (use SLOT=0|1)
	systemctl --user start $(SERVICE)

enable: ## Habilita e inicia os timers da automacao
	systemctl --user enable --now $(TIMERS)

disable: ## Desabilita e para os timers da automacao
	systemctl --user disable --now $(TIMERS)

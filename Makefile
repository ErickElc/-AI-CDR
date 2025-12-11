.PHONY: help build up down restart logs clean test

help: ## Mostra esta mensagem de ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Constrói todas as imagens Docker
	docker-compose build

up: ## Inicia todos os serviços
	docker-compose up -d

down: ## Para todos os serviços
	docker-compose down

restart: ## Reinicia todos os serviços
	docker-compose restart

logs: ## Mostra logs de todos os serviços
	docker-compose logs -f

logs-backend: ## Mostra logs do backend
	docker-compose logs -f backend

logs-mongodb: ## Mostra logs do MongoDB
	docker-compose logs -f mongodb

logs-orchestrator: ## Mostra logs do orquestrador
	docker-compose logs -f orchestrator

clean: ## Remove containers, volumes e imagens
	docker-compose down -v
	docker system prune -f

test: ## Executa testes do backend
	cd backend && dotnet test

dev-up: ## Inicia apenas MongoDB e Qdrant para desenvolvimento
	docker-compose -f docker-compose.dev.yml up -d

dev-down: ## Para serviços de desenvolvimento
	docker-compose -f docker-compose.dev.yml down

setup: ## Configuração inicial (cria .env se não existir)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Arquivo .env criado. Por favor, configure a OPENAI_API_KEY."; \
	fi



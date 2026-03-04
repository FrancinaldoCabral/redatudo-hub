# Makefile para facilitar comandos Docker

.PHONY: help build up down logs restart clean status

help: ## Mostrar esta ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build de todos os containers
	docker-compose build

up: ## Iniciar todos os serviços
	docker-compose up -d

down: ## Parar todos os serviços
	docker-compose down

logs: ## Ver logs de todos os serviços
	docker-compose logs -f

logs-api: ## Ver logs apenas da API
	docker-compose logs -f api

logs-worker: ## Ver logs apenas do Worker
	docker-compose logs -f worker

logs-frontend: ## Ver logs apenas do Frontend
	docker-compose logs -f frontend

restart: ## Reiniciar todos os serviços
	docker-compose restart

restart-api: ## Reiniciar apenas a API
	docker-compose restart api

restart-worker: ## Reiniciar apenas o Worker
	docker-compose restart worker

status: ## Ver status dos containers
	docker-compose ps

clean: ## Parar e remover containers (mantém volumes)
	docker-compose down

clean-all: ## Parar e remover tudo incluindo volumes (CUIDADO!)
	@echo "ATENÇÃO: Isso vai apagar TODOS os dados!"
	@read -p "Tem certeza? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
	fi

rebuild: ## Rebuild e restart completo
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

health: ## Verificar saúde dos serviços
	@echo "Verificando MongoDB..."
	@docker exec redatudo-mongodb mongosh --eval "db.runCommand('ping')" --quiet || echo "❌ MongoDB não está respondendo"
	@echo "Verificando Redis..."
	@docker exec redatudo-redis redis-cli ping || echo "❌ Redis não está respondendo"
	@echo "Verificando MinIO..."
	@curl -f http://localhost:9000/minio/health/live || echo "❌ MinIO não está respondendo"
	@echo "Verificando API..."
	@curl -f http://localhost:5000/health || echo "❌ API não está respondendo"
	@echo "Verificando Frontend..."
	@curl -f http://localhost:80/health || echo "❌ Frontend não está respondendo"

shell-api: ## Abrir shell no container da API
	docker exec -it redatudo-api /bin/sh

shell-worker: ## Abrir shell no container do Worker
	docker exec -it redatudo-worker /bin/sh

shell-mongo: ## Abrir shell do MongoDB
	docker exec -it redatudo-mongodb mongosh

backup-mongo: ## Backup do MongoDB
	@mkdir -p ./backups
	docker exec redatudo-mongodb mongodump --out /tmp/backup
	docker cp redatudo-mongodb:/tmp/backup ./backups/backup-$(shell date +%Y%m%d-%H%M%S)
	@echo "Backup criado em ./backups/"

dev: ## Ambiente de desenvolvimento (com logs)
	docker-compose up

prod: ## Ambiente de produção (background)
	docker-compose up -d
	@echo "Serviços iniciados! Use 'make logs' para ver logs"

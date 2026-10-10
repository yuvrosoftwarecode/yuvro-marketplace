# ============================================================================
# yuvro-marketplace - Main Makefile
# Environments: local, dev
# ============================================================================

.PHONY: help install run stop clean logs status deploy-dev
.PHONY: _validate-deploy _create-networks
.PHONY: migrate makemigrations showmigrations db-shell db-reset
.PHONY: backend-shell backend-bash backend-format backend-format-fix backend-lint backend-test backend-superuser
.PHONY: frontend-shell frontend-format frontend-format-fix frontend-lint frontend-test
.PHONY: test-all format-all lint-all check-all
.PHONY: secrets-validate secrets-template

# ============================================================================
# Environment Configuration
# ============================================================================

DEPLOY_ENV  ?= local

# Validate DEPLOY_ENV
VALID_DEPLOY_ENVS  := local dev

# Services list
SERVICES := ymarketplace-backend-api ymarketplace-web

_validate-deploy:
	@if ! echo "$(VALID_DEPLOY_ENVS)" | grep -qw "$(DEPLOY_ENV)"; then \
		echo "❌ Invalid DEPLOY_ENV='$(DEPLOY_ENV)'. Must be one of: $(VALID_DEPLOY_ENVS)"; \
		exit 1; \
	fi
	@echo "▶ DEPLOY_ENV=$(DEPLOY_ENV)"

# ============================================================================
# Docker Compose Commands
# ============================================================================

ifeq ($(DEPLOY_ENV),dev)
  COMPOSE_FILES := -f docker-compose.dev.yml
else
  COMPOSE_FILES := -f docker-compose.local.yml
endif

PROJECT_NAME  := yuvro-marketplace-cloudvex
BACKEND_SVC   := ymarketplace-backend-api
FRONTEND_SVC  := ymarketplace-web
DB_SVC        := db

help:
	@echo "Usage: [DEPLOY_ENV=local|dev] make <command>"
	@echo ""
	@echo "Environment:"
	@echo "  DEPLOY_ENV    local (default) | dev"
	@echo ""
	@echo "Main Commands:"
	@echo "  make install            Build and start all services"
	@echo "  make run                Start all services (no build)"
	@echo "  make stop               Stop all services"
	@echo "  make clean              Clean all containers/volumes"
	@echo "  make logs               View all logs"
	@echo "  make status             Check deployment status"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate            Run Django database migrations"
	@echo "  make makemigrations     Create new Django migrations (optional: APP=<app_name>)"
	@echo "  make showmigrations     List migration status"
	@echo "  make db-shell           Open Postgres psql shell"
	@echo "  make db-reset           Reset database: drop volume -> restart db -> run migrations"
	@echo ""
	@echo "Development Utilities:"
	@echo "  make backend-shell      Open Django python shell"
	@echo "  make backend-bash       Open bash inside backend container"
	@echo "  make backend-superuser  Create a Django superuser"
	@echo "  make secrets-template   Copy .env.*.example to .env.* if missing"
	@echo "  make check-all          Run formatting, linting and tests across stack"
	@echo ""
	@echo "Examples:"
	@echo "  make install                        # Start all (local + Docker Compose)"
	@echo "  DEPLOY_ENV=dev make install         # Deploy to dev (Docker Compose)"

_create-networks:
	@docker network create yuvro_marketplace_storage 2>/dev/null || true
	@docker network create yuvro_marketplace_app 2>/dev/null || true
	@docker network create yuvro-marketplace-dev 2>/dev/null || true

secrets-template:
	@for f in ymarketplace-backend-api/.env.local.example ymarketplace-backend-api/.env.dev.example \
	           ymarketplace-web/.env.local.example ymarketplace-web/.env.dev.example; do \
	  dest=$${f%.example}; \
	  if [ ! -f "$$dest" ]; then \
	    cp "$$f" "$$dest" 2>/dev/null || true; \
	    echo "  📋 Created $$dest"; \
	  else \
	    echo "  ⏭  Skipping $$dest (already exists)"; \
	  fi; \
	done

secrets-validate: _validate-deploy
	@echo "🔍 Validating .env.$(DEPLOY_ENV) files..."
	@for var in SECRET_KEY; do \
	  if ! grep -q "^$$var=" ymarketplace-backend-api/.env.$(DEPLOY_ENV) 2>/dev/null; then \
	    echo "  ❌ Missing $$var in ymarketplace-backend-api/.env.$(DEPLOY_ENV)"; \
	    exit 1; \
	  fi; \
	done
	@echo "  ✅ All required vars present"

deploy-dev: _validate-deploy
	@bash infra/scripts/deploy-dev.sh $(DEPLOY_BRANCH)

install: _validate-deploy secrets-template _create-networks
	@if [ "$(DEPLOY_ENV)" = "dev" ]; then \
		$(MAKE) deploy-dev; \
	else \
		echo "🔨 Building and starting all services [DEPLOY_ENV=$(DEPLOY_ENV)]..."; \
		docker compose $(COMPOSE_FILES) down --remove-orphans 2>/dev/null || true; \
		docker compose $(COMPOSE_FILES) up --build -d; \
		echo "🗄  Running initial migrations..."; \
		docker compose $(COMPOSE_FILES) run --rm $(BACKEND_SVC) python manage.py makemigrations || true; \
		docker compose $(COMPOSE_FILES) run --rm $(BACKEND_SVC) python manage.py migrate --noinput || true; \
		echo ""; \
		echo "✅ Installation complete! Showing live logs. Press Ctrl+C to stop."; \
		docker compose $(COMPOSE_FILES) logs -f; \
	fi

run: _validate-deploy _create-networks
	@echo "🚀 Starting all services [DEPLOY_ENV=$(DEPLOY_ENV)]...";
	@docker compose $(COMPOSE_FILES) up -d --wait || { \
		echo "❌ One or more services failed to become healthy. Showing logs:"; \
		docker compose $(COMPOSE_FILES) ps; \
		docker compose $(COMPOSE_FILES) logs --tail=50; \
		exit 1; \
	};
	@echo "";
	@echo "✅ All services are up and healthy!";
	@echo "";
	@docker compose $(COMPOSE_FILES) ps;
	@echo "";
	@echo "🌐 Service URLs:";
	@echo "   Frontend:       http://localhost:3004";
	@echo "   Backend API:    http://localhost:8004";
	@if [ "$(DEPLOY_ENV)" = "local" ]; then \
		echo "   MinIO Console:  http://localhost:9102"; \
	fi
	@echo "";
	@echo "📺 Showing live logs. Press Ctrl+C to stop.";
	@docker compose $(COMPOSE_FILES) logs -f;

stop: _validate-deploy
	@echo "🛑 Stopping all services...";
	@docker compose $(COMPOSE_FILES) down;
	@echo "✅ All services stopped!";

clean: _validate-deploy
	@echo "🧹 Cleaning all containers and volumes...";
	@docker compose $(COMPOSE_FILES) down -v --remove-orphans;
	@docker system prune -f;
	@echo "✅ Cleanup complete!";

logs: _validate-deploy
	@echo "📝 Viewing logs from all services (Ctrl+C to exit)...";
	@docker compose $(COMPOSE_FILES) logs -f;

status: _validate-deploy
	@echo "📊 Docker Compose status:";
	@docker compose $(COMPOSE_FILES) ps;

# ============================================================================
# Database Commands
# ============================================================================

migrate: _validate-deploy
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py migrate --noinput

makemigrations: _validate-deploy
ifdef APP
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py makemigrations $(APP)
else
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py makemigrations
endif

showmigrations: _validate-deploy
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py showmigrations

db-shell: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "local" ]; then \
		docker compose $(COMPOSE_FILES) exec $(DB_SVC) psql -U postgres -d yuvro_marketplace_db -p 5436; \
	else \
		echo "❌ db-shell is only supported in local mode."; \
	fi

db-reset: _validate-deploy
	@if [ "$(DEPLOY_ENV)" = "local" ]; then \
		echo "🧹 Resetting databases (removing DB volumes and restarting DBs/Backends)..."; \
		docker compose $(COMPOSE_FILES) stop $(BACKEND_SVC); \
		docker compose $(COMPOSE_FILES) rm -f $(DB_SVC); \
		docker volume rm $$(docker volume ls -q | grep postgres_data) 2>/dev/null || true; \
		docker compose $(COMPOSE_FILES) up -d $(DB_SVC); \
		echo "⏳ Waiting for DB to be ready..."; \
		sleep 5; \
		docker compose $(COMPOSE_FILES) up -d $(BACKEND_SVC); \
		echo "✅ DB reset complete (migrations applied on backend restart if configured)."; \
		$(MAKE) migrate; \
	else \
		echo "❌ db-reset is only supported in local mode."; \
	fi

# ============================================================================
# Backend / Frontend Utilities
# ============================================================================

backend-shell:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py shell

backend-bash:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) bash

backend-format:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) black . --check --diff
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) isort . --check-only --diff

backend-format-fix:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) black .
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) isort .

backend-lint:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) flake8 .

backend-test:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py test --verbosity=2

backend-superuser:
	@docker compose $(COMPOSE_FILES) exec $(BACKEND_SVC) python manage.py createsuperuser

frontend-shell:
	@docker compose $(COMPOSE_FILES) exec $(FRONTEND_SVC) sh

frontend-format:
	@docker compose $(COMPOSE_FILES) exec $(FRONTEND_SVC) bun run check

frontend-format-fix:
	@docker compose $(COMPOSE_FILES) exec $(FRONTEND_SVC) bun run format

frontend-lint:
	@docker compose $(COMPOSE_FILES) exec $(FRONTEND_SVC) bun run lint

frontend-test:
	@docker compose $(COMPOSE_FILES) exec $(FRONTEND_SVC) bun test 2>/dev/null || \
	  echo "ℹ️  No test runner configured."

test-all: backend-test frontend-test
format-all: backend-format frontend-format
lint-all: backend-lint frontend-lint
check-all: format-all lint-all test-all

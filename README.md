# yuvro-marketplace

Modern full-stack marketplace application built with **Django 5 REST Framework** backend and **TanStack Start (React 19 + Vite + Tailwind CSS v4)** SSR frontend.

---

## 🏛 Architecture Overview

- **Backend**: Python 3.11, Django 5, Django REST Framework, SimpleJWT, Allauth, drf-spectacular (Swagger OpenAPI 3), MinIO / S3 Storage, Prometheus & OpenTelemetry.
- **Frontend**: TanStack Start, React 19, TypeScript, Vite 8, Tailwind CSS v4, Bun, Radix UI & Lucide icons.
- **Data & Storage**: PostgreSQL 16, MinIO (local S3 object storage).
- **Environment & Deployment**: Docker Compose for local development (`docker-compose.local.yml`) and dev/production on EC2 (`docker-compose.dev.yml`).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Docker & Docker Compose
- Make
- Bun (or Node 20+) for local frontend development (optional if using Docker)
- Python 3.11+ (optional if using Docker)

### 2. Setup Environment Files
```bash
make secrets-template
```
This copies `.env.local.example` and `.env.dev.example` to `.env.local` and `.env.dev` for both backend and frontend.

### 3. Build & Launch Everything
```bash
make install
```
This builds Docker images, initializes networks, launches Postgres, MinIO, Backend, and Frontend, and applies database migrations.

### 4. Service Endpoints
| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend** | http://localhost:3004 | TanStack Start UI |
| **Backend API** | http://localhost:8004 | Django REST API |
| **Swagger UI** | http://localhost:8004/api/docs/ | Interactive API Documentation |
| **Health Check** | http://localhost:8004/api/health/ | Health Status |
| **MinIO Console**| http://localhost:9102 | S3 Storage Console (`minioadmin` / `minioadmin`) |

---

## 🛠 Useful Makefile Commands

```bash
# General Management
make run              # Start all containers
make stop             # Stop all containers
make logs             # Tail logs across all services
make clean            # Remove containers and volumes

# Database & Migrations
make makemigrations   # Generate migrations
make migrate          # Run migrations
make db-shell         # Open psql CLI inside PostgreSQL
make db-reset         # Reset local database from scratch

# Backend
make backend-shell    # Django shell
make backend-superuser# Create Django superuser

# Code Quality
make backend-format   # Check Python formatting (black, isort)
make backend-lint     # Run flake8
make frontend-lint    # Run ESLint on frontend
make check-all        # Run all format, lint, and test checks
```

---

## 📁 Repository Structure

```
yuvro-marketplace/
├── backend/                  # Django 5 Backend
│   ├── authentication/       # Custom User model, JWT, OAuth, auth views
│   ├── config/               # Settings, WSGI/ASGI, URLs
│   ├── core/                 # BaseModel, Health, Storage, Observability
│   ├── Dockerfile            # Multi-stage Python 3.11 Dockerfile
│   ├── requirements.txt      # Python dependencies
│   └── manage.py
├── frontend/                 # TanStack Start / React Frontend
│   ├── src/                  # React components, routes, router, styles
│   │   ├── components/       # Radix UI & Layout components
│   │   ├── lib/              # API client, Auth Context, utilities
│   │   └── routes/           # File-based routing (Root, Index, Login, Register)
│   ├── Dockerfile            # Multi-stage Bun / Node SSR Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── Makefile                  # Project orchestration
├── docker-compose.local.yml  # Local stack
├── docker-compose.dev.yml    # Dev / Staging stack
└── reset-migrations.sh       # Migration reset utility
```

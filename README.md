# Project Overview
Building a lightweight computer inventory tracking system with FastAPI backend, PostgreSQL database, and Next.js frontend. The system tracks physical servers/workstations, hardware specs, and management controllers (iLO/iDRAC/IPMI).

## Technical Stack

Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic
Database: PostgreSQL 16 with JSONB for flexible hardware specs
Frontend: Node.js 22+, Next.js 14 (App Router), TypeScript, Tailwind CSS
Deployment: Docker Compose

## Backend
### Initilize

I am doing my work on Windows - adjuast as needed for MacOS/Linux

```
# from backend directory - initialize virtual environment
python -m venv venv

# activate virtual environment
.\venv\Scripts\Activate.ps1

# To DEACTIVATE the virtual environment:
deactivate

# Upgrade pip
python -m pip install --upgrade pip

# Install required packages with pip
pip install -r requirements.txt
```
For dev work I am runnign Docker Postgres 16 image. `docker-compose` will pull and initialize the db

```
# Start Postgres image (uses docker/initi.sql to initialize)
docker-compose up -d postgres

# Shutdown Postgres container
docker-compose down

# Shutdown and remove data
docker-compose down -v
```
Once dev Database is up and runnign (credentials are part of `docker-compose.yml` and `docker/init.sql` files), load the schema


## Frontend

```
# Start development server:
npm run dev

# Build for production:
npm run build

# Run production server:
npm start

# Run linting:
npm run lint
```

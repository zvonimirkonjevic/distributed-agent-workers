.PHONY: help up down clean
.DEFAULT_GOAL := help

help:
	@echo "Available commands:"
	@echo "  make up     Build images and start all services in the background"
	@echo "  make down   Stop and remove containers, keeping data"
	@echo "  make clean  Stop services and delete volumes and locally built images"

up:
	@echo "Building and starting services..."
	docker compose up --build -d
	@echo "Services are up: app http://localhost:8001, api http://localhost:8000"

down:
	@echo "Stopping services..."
	docker compose down
	@echo "Services stopped."

clean:
	@echo "Removing containers, volumes, and locally built images..."
	docker compose down --volumes --rmi local --remove-orphans
	@echo "Clean complete."

.PHONY: up down clean

up:
	docker compose up --build -d

down:
	docker compose down
	
clean:
	docker compose down --volumes --rmi local --remove-orphans

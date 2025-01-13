DOCKER_COMPOSE = docker-compose
DOCKER_FRONTEND = $(DOCKER_COMPOSE) exec frontend
DOCKER_BACKEND = $(DOCKER_COMPOSE) exec backend

##
## Docker
## ------
##
build:
	$(DOCKER_COMPOSE) build

start:
	$(DOCKER_COMPOSE) up

start-build:
	$(DOCKER_COMPOSE) up --build

build-prod:
	NODE_ENV=production $(DOCKER_COMPOSE) build

start-prod:
	NODE_ENV=production $(DOCKER_COMPOSE) up --build

kill:
	$(DOCKER_COMPOSE) kill
	$(DOCKER_COMPOSE) down --volumes --remove-orphans

stop:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) stop
	$(DOCKER_COMPOSE) up -d --remove-orphans --no-recreate

##
## Frontend
## -----
##
build-frontend: 
	$(DOCKER_COMPOSE) build frontend

start-frontend:
	$(DOCKER_COMPOSE) up frontend

start-build-frontend:
	$(DOCKER_COMPOSE) up --build frontend

build-prod-frontend: 
	NODE_ENV=production $(DOCKER_COMPOSE) build frontend

start-prod-frontend: 
	NODE_ENV=production $(DOCKER_COMPOSE) up --build frontend

sh-frontend: 	
	docker exec -it word-guesser_frontend_1 sh
##
## Backend
## -----
##
build-backend: 
	$(DOCKER_COMPOSE) build backend

start-backend:
	$(DOCKER_COMPOSE) up backend

start-build-backend:
	$(DOCKER_COMPOSE) up --build backend

build-prod-backend: 
	NODE_ENV=production $(DOCKER_COMPOSE) build backend

start-prod-backend: 
	NODE_ENV=production $(DOCKER_COMPOSE) up --build backend

sh-backend: 	
	docker exec -it word-guesser_backend_1 sh


build:
	docker-compose build
	

up:
	docker-compose up --remove-orphans
	docker-compose run web python ft_transcendence/manage.py makemessages -d djangojs -l fr --ignore=staticfiles/**
	docker-compose run web python ft_transcendence/manage.py makemessages -d djangojs -l es --ignore=staticfiles/**
	docker-compose run web python ft_transcendence/manage.py compilemessages
	mkdir -p ft_transcendence/ft_transcendence/migrations
	touch ft_transcendence/ft_transcendence/migrations/__init__.py
	docker-compose run web python ft_transcendence/manage.py makemigrations ft_transcendence
	docker-compose run web python ft_transcendence/manage.py migrate --noinput

down:
	docker-compose down --remove-orphans
	rm -rf ft_transcendence/ft_transcendence/__pycache__
	rm -rf staticfiles
logs:
	docker-compose logs -f

migrate:
	docker-compose run web python ft_transcendence/manage.py migrate --noinput

collectstatic:
	docker-compose run web python ft_transcendence/manage.py collectstatic --noinput --clear

reboot:
	docker system prune -a --volumes -f
	
down-server:
	sudo pkill -f runserver

reset-db:
	rm -rf ft_transcendence/ft_transcendence/migrations
	mkdir -p ft_transcendence/ft_transcendence/migrations
	touch ft_transcendence/ft_transcendence/migrations/__init__.py
	docker-compose run web python ft_transcendence/manage.py makemigrations ft_transcendence
	docker-compose run web python ft_transcendence/manage.py migrate --noinput

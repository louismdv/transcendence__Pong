build:
	docker-compose build

up:
	docker-compose up 

down:
	docker-compose down && rm -rf ft_transcendence/ft_transcendence/__pycache__ && rm -rf ft_transcendence/ft_transcendence/migrations

logs:
	docker-compose logs -f

migrate:
	docker-compose run web python ft_transcendence/manage.py migrate --noinput

collectstatic:
	docker-compose run web python ft_transcendence/manage.py collectstatic --noinput

reboot :
	docker system prune -a --volumes

down-server :
	sudo pkill -f runserver

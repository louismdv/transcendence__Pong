build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

migrate:
	docker-compose run web python ft_transcendence/manage.py migrate --noinput

collectstatic:
	docker-compose run web python ft_transcendence/manage.py collectstatic --noinput

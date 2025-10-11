# Transcendence__Pong

This project is part of the 42 common-core and consists of creating a web app to play pong and chat with friends online.
Deployed on Azure VM accessible on https://www.louismdv.works


## Web:
- Frontend framework: Vanilla JS
- Backend framework: Django
- Websockets for connecting online players

## Database:
- Postgres db for account authentification data
- hashed passwords
- Live chat messages aren't hashed at the moment

## Security:
- Hash any passwords stored in the database, if applicable.
- Protect the website against SQL injections and XSS attacks.
- Enable HTTPS for all website features and use WSS instead of WS if applicable.
- Implement form validation for all user input, either client-side or server-side, depending on the backend.
- Prioritize security even if you don't use JWT tokens; protect API routes and consider implementing 2FA if necessary.

## Features:
- Local game sharing keyboard btw 2 players
- Online game on seperate machines
- Live chat

## Accessibility:
- Web app available in English (Default)/French/Spanish
- Bright and Dark mode toggle
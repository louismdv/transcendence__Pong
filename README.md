# Transcendence
## WEB

- **Major module**: Use a Framework to build the backend.
- **Minor module**: Use a framework or a toolkit to build the frontend.
- **Minor module**: Use a database for the backend.

## MANAGEMENT

- **Major module**: Standard user management, authentication, users across tournaments.
- **Major module**: Implementing remote authentication.

## GAMEPLAY

- **Major module**: Live chat.

## ACCESSIBILITY

- **Minor module**: Support on all devices.
- **Minor module**: Expanding browser compatibility.
- **Minor module**: Multiple language support.
- **Minor module**: Add accessibility for visually impaired users.       


ROADMAP / TODO list 

- Phase 1 : back-end et base de donnee, pose les fondations du projet
- Phase 2 : front-end simple setup de front-end a backend
- Phase 3 : user et management standart avec authentification
- Phase 4 : le jeu + chat live
- Phase 5 : opti du front et back clean code + test du projet complet

## !!!!! MANDATORY !!!!!
- Hash any passwords stored in the database, if applicable.

- Protect the website against SQL injections and XSS attacks.

- Enable HTTPS for all website features and use WSS instead of WS if applicable.

- Implement form validation for all user input, either client-side or server-side, depending on the backend.

- Prioritize security even if you don't use JWT tokens; protect API routes and consider implementing 2FA if necessary.



### Phase 1 : Configuration du backend et de la base de données

- [ ] Use the Django framework for the backend
- [ ] Set up the database (use PostgreSQL)
- [ ] Create database models for users
- [ ] Implement user registration and login
- [ ] Ensure secure password storage (hashing and safe storage)
- [ ] Protect against SQL injections and XSS attacks
- [ ] Set up HTTPS and WSS if applicable
- [ ] Implement form validation on the server side

### Phase 2: Frontend

- [ ] Users can subscribe to the website in a secure way.
- [ ] Registered users can log in in a secure way.
- [ ] Users can select a unique display name to play the tournaments.
- [ ] Users can update their information.
- [ ] Users can upload an avatar, with a default option if none is provided.
- [ ] Users can add others as friends and view their online status.
- [ ] User profiles display stats, such as wins and losses.
- [ ] Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.


### Phase 3 :  User Management

- [ ] Users can subscribe to the website in a secure way.
- [ ] Registered users can log in in a secure way.
- [ ] Users can select a unique display name to play the tournaments.
- [ ] Users can update their information.
- [ ] Users can upload an avatar, with a default option if none is provided.
- [ ] Users can add others as friends and view their online status.
- [ ] User profiles display stats, such as wins and losses.
- [ ] Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.

#### Implementing a remote authentication.
In this major module, the goal is to implement the following authentication system:
OAuth 2.0 authentication with 42. Key features and objectives include:

- [ ] Integrate the authentication system, allowing users to securely sign in.
- [ ] Obtain the necessary credentials and permissions from the authority to enable a secure login.
- [ ] Implement user-friendly login and authorization flows that adhere to best practices and security standards.
- [ ] Ensure the secure exchange of authentication tokens and user information between the web application and the authentication provider.

Be careful, the management of duplicate usernames/emails is at your discretion. You must provide a solution that makes sense.

### Phase 4 : The actual game + live chat 

- [ ] Implement a local Pong game for two players using the same keyboard.
- [ ] Add the ability to play against remote players via a Remote Players module.
- [ ] Create a tournament system with multiple players and match display.
- [ ] Implement a registration system for player aliases at the start of a tournament.
- [ ] Set up a matchmaking system to organize matches and announce upcoming battles.
- [ ] Ensure uniform paddle speed rules for all players, including AI.
- [ ] Develop the Pong game following frontend constraints or use the FrontEnd/Graphics module for visual enhancements.



# Transcendence__Pong

This project is part of the 42 common-core and consists of creating a web app to play pong and chat with friends online.
Deployed on Azure VM accessible on https://www.louismdv.works


## Web:
- Frontend framework: Vanilla JS
- Backend framework: Django
- Websockets for connecting online players
- certbot for auto-signed SSL certificates

## Database:
- Postgres db for account authentification data
- Hashed passwords
- Live chat messages aren't hashed at the moment

## Security:
- Hash any passwords stored in the database, if applicable.
- Protect the website against SQL injections and XSS attacks.
- Enable HTTPS for all website features and use WSS instead of WS if applicable.
- Implement form validation for all user input, either client-side or server-side, depending on the backend.
- Prioritize security even if you don't use JWT tokens; protect API routes and consider implementing 2FA if necessary.

## Features:
- Local game for 2 players sharing 1 keyboard
- Online game for 2 players on seperate machines
- Live chat

## Accessibility:
- Web app available in English (Default)/French/Spanish
- Bright and Dark mode toggle

## Interface Preview

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/358bab73-baf3-45dc-bfad-d6b05d7b9da2" width="250"/><br>
      <sub><b>Login</b></sub>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/40386bcd-ffa4-4802-9caf-69f8bcf68e13" width="250"/><br>
      <sub><b>Home</b></sub>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/59c41d55-f370-47e4-805a-87fc3db3bf1f" width="250"/><br>
      <sub><b>Messaging</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/3f9ef8f7-97fc-4fbf-97d3-cb1119fd4fcf" width="250"/><br>
      <sub><b>Friends</b></sub>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/ffc1ad86-c489-4154-97fb-f3963b7d5cd6" width="250"/><br>
      <sub><b>Profile Settings</b></sub>
    </td>
    <td align="center">
      <a href="https://github.com/user-attachments/assets/d3934a6b-a942-4b80-b5af-b6ffaab05b1e">
        <img src="https://github.com/user-attachments/assets/40386bcd-ffa4-4802-9caf-69f8bcf68e13" width="250"/>
      </a><br>
      <sub><b>🎬 Demo Video (click to watch)</b></sub>
    </td>
  </tr>
</table>

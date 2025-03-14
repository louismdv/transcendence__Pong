
from django.shortcuts import render, redirect
from django.http import HttpResponse

def lobby(request):
    if request.method == 'POST':
        # Create a new room
        room_name = request.POST.get('room_name')
        return redirect('game_room', room_name=room_name)
    return render(request, 'online_game/lobby.html')

def game_room(request, room_name):
    # If the room exists, the players can join. You can also handle matchmaking here.
    return render(request, 'online_game/game_room.html', {'room_name': room_name})
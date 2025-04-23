
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

@login_required(login_url='/login')
@csrf_protect
def lobby(request):
    if request.method == 'POST':
        # Create a new room
        room_name = request.POST.get('room_name')
        return redirect('game_room', room_name=room_name)
    return render(request, 'lobby.html')

@login_required(login_url='/login')
def gameroom(request, room_name):
    # If the room exists, the players can join. You can also handle matchmaking here.
    return render(request, 'gameroom.html', {'room_name': room_name})
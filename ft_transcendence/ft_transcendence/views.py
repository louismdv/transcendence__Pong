# ft_transcendence/views.py

from django.shortcuts import render

def home(request):
    return render(request, 'liveChat.html')
def register(request):
    return render(request, 'liveChat.html')
def login_view(request):
    return render(request, 'liveChat.html')
def chat(request):
    return render(request, 'liveChat.html')

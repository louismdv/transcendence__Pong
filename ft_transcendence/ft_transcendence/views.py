# ft_transcendence/views.py

from django.shortcuts import render

def main(request):
    return render(request, 'main.html')
def home(request):
    return render(request, 'home.html')
def livechat(request):
    return render(request, 'livechat.html')
def login_view(request):
    return render(request, 'login.html')
def register(request):
    return render(request, 'register.html')


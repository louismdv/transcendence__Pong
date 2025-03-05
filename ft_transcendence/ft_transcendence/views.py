from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

def main(request):
    return render(request, 'main.html')

@login_required(login_url='/login')
def home(request):
    return render(request, 'home.html')

def livechat(request):
    return render(request, 'livechat.html')

def localgame(request):
    return render(request, 'localgame.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            return redirect('login')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})

@csrf_protect
def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')
            else:
                messages.error(request, 'Invalid username or password.')
                return redirect('login')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})
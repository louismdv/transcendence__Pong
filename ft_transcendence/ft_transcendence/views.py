# ft_transcendence/views.py

from django.shortcuts import render

def home(request):
    return render(request, 'login.html')
# def about_view(request):
#     return render(request, 'apropos.html')
# def contact_view(request):
#     return render(request, 'contact.html')
# def skills_view(request):
#     return render(request, 'skills.html')
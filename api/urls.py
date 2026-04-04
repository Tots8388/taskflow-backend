from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    TaskViewSet, CategoryViewSet,
    RegisterView, ChangePasswordView, ProfileView
)

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
] + router.urls
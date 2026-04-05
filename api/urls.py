from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    TaskViewSet, CategoryViewSet,
    RegisterView, ChangePasswordView, ProfileView,
    LogoutView, VerifyEmailView, ResendVerificationView,
)

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Email verification
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),

    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
] + router.urls

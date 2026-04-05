import uuid
from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, generics, filters, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import Task, Category, EmailVerificationToken
from .serializers import (
    TaskSerializer, CategorySerializer,
    RegisterSerializer, ChangePasswordSerializer, UserProfileSerializer
)


# ── PAGINATION ────────────────────────────────────────────────

class TaskPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ── AUTH ──────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """POST /api/register/  Body: { username, email, password }"""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """
    POST /api/logout/
    Body: { refresh }
    Blacklists the refresh token. No auth required — token validates itself.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh', ''))
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'})
        except TokenError:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """POST /api/change-password/  Body: { old_password, new_password }"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── EMAIL VERIFICATION ────────────────────────────────────────

class VerifyEmailView(APIView):
    """POST /api/verify-email/  Body: { token }"""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '')
        try:
            vt = EmailVerificationToken.objects.select_related('user__profile').get(token=token_str)
            vt.user.profile.email_verified = True
            vt.user.profile.save()
            vt.delete()
            return Response({'detail': 'Email verified successfully.'})
        except (EmailVerificationToken.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """POST /api/resend-verification/  Sends a new verification email."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.email:
            return Response({'detail': 'No email address on file.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.profile.email_verified:
            return Response({'detail': 'Email already verified.'})

        vt, _ = EmailVerificationToken.objects.get_or_create(user=user)
        vt.token = uuid.uuid4()
        vt.save()

        verify_url = f"{settings.FRONTEND_URL}/?verify={vt.token}"
        send_mail(
            'Verify your Taskflow email',
            f'Hi {user.username},\n\nPlease verify your email:\n{verify_url}\n\nThe Taskflow team',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
        return Response({'detail': 'Verification email sent.'})


# ── PROFILE ───────────────────────────────────────────────────

class ProfileView(APIView):
    """GET/PATCH /api/profile/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(
            request.user.profile,
            context={'request': request}
        )
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user.profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── TASKS ─────────────────────────────────────────────────────

class TaskViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD at /api/tasks/.
    Query params: ?search=  ?priority=  ?done=  ?category=  ?ordering=  ?page=  ?archived=true
    Extra actions: POST /api/tasks/{id}/archive/  and  POST /api/tasks/{id}/restore/
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TaskPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['priority', 'done', 'category']
    search_fields = ['name']
    ordering_fields = ['created_at', 'due', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Task.objects.filter(user=self.request.user)
        # List: respect ?archived=true; all other actions (detail, update, destroy, custom) see all
        if self.action == 'list':
            if self.request.query_params.get('archived') == 'true':
                return qs.filter(archived=True)
            return qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        task = get_object_or_404(Task, pk=pk, user=request.user, archived=False)
        task.archived = True
        task.save()
        return Response({'detail': 'Task archived.'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        task = get_object_or_404(Task, pk=pk, user=request.user, archived=True)
        task.archived = False
        task.save()
        return Response({'detail': 'Task restored.'})


# ── CATEGORIES ────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    """Standard CRUD at /api/categories/. Query params: ?search="""
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

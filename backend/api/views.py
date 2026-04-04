from rest_framework import viewsets, generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from .models import Task, Category
from .serializers import (
    TaskSerializer, CategorySerializer,
    RegisterSerializer, ChangePasswordSerializer, UserProfileSerializer
)


# ── PAGINATION ────────────────────────────────────────────────
# Returns 10 tasks per page by default.
# Usage: GET /api/tasks/?page=2
# Change page_size or pass ?page_size=20 (up to max 100)

class TaskPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ── AUTH ──────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/
    Body: { username, email, password }
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ChangePasswordView(APIView):
    """
    POST /api/change-password/
    Body: { old_password, new_password }
    Requires: Bearer token
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── PROFILE ───────────────────────────────────────────────────

class ProfileView(APIView):
    """
    GET  /api/profile/          → retrieve own profile
    PATCH /api/profile/         → update bio or avatar
    """
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
    GET    /api/tasks/              → list (paginated)
    POST   /api/tasks/              → create
    GET    /api/tasks/{id}/         → retrieve
    PUT    /api/tasks/{id}/         → full update
    PATCH  /api/tasks/{id}/         → partial update
    DELETE /api/tasks/{id}/         → delete

    Query params:
      ?search=keyword               → search by name
      ?priority=high|medium|low     → filter by priority
      ?done=true|false              → filter by completion
      ?category=1                   → filter by category id
      ?ordering=due|-created_at     → sort
      ?page=2&page_size=20          → pagination
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
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── CATEGORIES ────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    """
    GET    /api/categories/         → list all categories
    POST   /api/categories/         → create
    GET    /api/categories/{id}/    → retrieve
    PUT    /api/categories/{id}/    → update
    DELETE /api/categories/{id}/    → delete

    Query params:
      ?search=keyword               → search by name
    """
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for registering a new user and creating their UserProfile."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        read_only_fields = ['id']

    def validate_email(self, value):
        """Ensure email addresses are unique (case-insensitive)."""
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError(
                'A user with this email address already exists.'
            )
        return normalized_email

    def validate_password(self, value):
        """Validate password strength using Django's configured validators."""
        validate_password(value)
        return value

    def create(self, validated_data):
        """Create user with hashed password and initialize associated profile."""
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
            )
            UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing and updating authenticated user profile data."""

    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'phone_number',
            'location',
            'profile_image',
            'created_at',
            'updated_at',
        ]
        # Protect account identity and system timestamps from client modification
        read_only_fields = [
            'id',
            'username',
            'email',
            'created_at',
            'updated_at',
        ]

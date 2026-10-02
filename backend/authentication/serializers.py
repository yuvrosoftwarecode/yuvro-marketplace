from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from authentication.models import OTPToken, UserSession

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "profile_image",
            "avatar",
            "phone_number",
            "is_active",
            "is_applied",
            "is_temp_pw",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_staff", "created_at", "updated_at"]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "password", "full_name", "role", "phone_number"]

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized

    def create(self, validated_data):
        email = validated_data["email"].strip().lower()
        validated_data["email"] = email

        if not validated_data.get("username"):
            base_username = email.split("@")[0][:100]
            candidate_username = base_username
            counter = 1
            while User.objects.filter(username__iexact=candidate_username).exists():
                candidate_username = f"{base_username}_{counter}"
                counter += 1
            validated_data["username"] = candidate_username

        role = validated_data.get("role", User.Role.RECRUITER_FREELANCER)
        # Recruiter signup creates an inactive account with is_applied=False until application is submitted & reviewed
        if role == User.Role.RECRUITER_FREELANCER:
            validated_data["is_active"] = False
            validated_data["is_applied"] = False
        return User.objects.create_user(**validated_data)



class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    required_role = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        required_role = attrs.get("required_role") or attrs.get("role")

        if email and password:
            user = authenticate(
                request=self.context.get("request"), email=email, password=password
            )
            if not user:
                # Handle inactive users whose password is valid
                candidate = User.objects.filter(email__iexact=email).first()
                if candidate and candidate.check_password(password):
                    user = candidate
                else:
                    raise serializers.ValidationError("Invalid email or password.")

            if not user.is_active and user.role != User.Role.RECRUITER_FREELANCER:
                raise serializers.ValidationError("This user account is disabled.")

            if required_role:
                if required_role == "recruiter_account_manager":
                    if not (
                        user.role == User.Role.RECRUITER_ACCOUNT_MANAGER
                        or getattr(user, "is_account_manager", False)
                        or (user.email and "acctmanager" in user.email.lower())
                    ):
                        raise serializers.ValidationError("Access denied.")
                elif required_role == "recruiter_freelancer":
                    if not (
                        user.role == User.Role.RECRUITER_FREELANCER
                        and not getattr(user, "is_account_manager", False)
                        and not (user.email and "acctmanager" in user.email.lower())
                    ):
                        raise serializers.ValidationError("Access denied.")
                elif user.role != required_role:
                    raise serializers.ValidationError("Access denied.")

            attrs["user"] = user
            return attrs
        raise serializers.ValidationError("Must include 'email' and 'password'.")


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.CharField(default="login")


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.CharField(default="login")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(required=True, max_length=6)
    new_password = serializers.CharField(required=True, min_length=8)


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ["id", "user_agent", "ip_address", "created_at"]

from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'profiles'

    def ready(self):
        # Registers the user_signed_up signal receiver (see signals.py).
        import profiles.signals  # noqa: F401

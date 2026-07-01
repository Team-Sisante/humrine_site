# core/management/commands/setup_social_apps.py

import os
from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp
from humrine_site.settings.base import require_env  # correct import


class Command(BaseCommand):
    help = 'Idempotent: create or update SocialApp entries for Google, Facebook, Twitter'

    def handle(self, *args, **options):
        site = Site.objects.get_current()

        # Use require_env with default='' so missing vars raise an error,
        # but we catch and handle them gracefully to inform the user.
        providers = {
            'google':   ('Google Dev',   'GOOGLE_CLIENT_ID',   'GOOGLE_CLIENT_SECRET'),
            'facebook': ('Facebook Dev', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'),
            'twitter_oauth2': ('Twitter Dev', 'TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'),
        }

        for provider_id, (name, id_var, secret_var) in providers.items():
            try:
                client_id = require_env(id_var)      # will raise if missing
                secret = require_env(secret_var)
            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f'Skipping {provider_id}: {e}'
                ))
                continue

            # Remove duplicates
            apps = SocialApp.objects.filter(provider=provider_id)
            if apps.count() > 1:
                first = apps.first()
                apps.exclude(pk=first.pk).delete()
                self.stdout.write(self.style.SUCCESS(f'Removed duplicate {provider_id} entries'))

            app, created = SocialApp.objects.update_or_create(
                provider=provider_id,
                defaults={
                    'name': name,
                    'client_id': client_id,
                    'secret': secret,
                },
            )
            if created:
                app.sites.add(site)
                self.stdout.write(self.style.SUCCESS(f'Created {provider_id} SocialApp'))
            else:
                app.sites.add(site)
                self.stdout.write(self.style.SUCCESS(f'Updated {provider_id} SocialApp'))

        self.stdout.write(self.style.SUCCESS('All social apps are ready'))
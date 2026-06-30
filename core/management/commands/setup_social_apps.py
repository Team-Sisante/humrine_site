# core/management/commands/setup_social_apps.py

from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp


class Command(BaseCommand):
    help = 'Idempotent: create or update SocialApp entries for Google, Facebook, Twitter'

    def handle(self, *args, **options):
        site = Site.objects.get_current()

        providers = {
            'google':   ('Google Dev',   settings.GOOGLE_CLIENT_ID,   settings.GOOGLE_CLIENT_SECRET),
            'facebook': ('Facebook Dev', settings.FACEBOOK_CLIENT_ID, settings.FACEBOOK_CLIENT_SECRET),
            'twitter':  ('Twitter Dev',  settings.TWITTER_CLIENT_ID,  settings.TWITTER_CLIENT_SECRET),
        }

        for provider_id, (name, client_id, secret) in providers.items():
            if not client_id or not secret:
                self.stdout.write(self.style.WARNING(
                    f'Skipping {provider_id}: credentials not configured'
                ))
                continue

            # Remove duplicates (keep the first one, delete extras)
            apps = SocialApp.objects.filter(provider=provider_id)
            if apps.count() > 1:
                first = apps.first()
                apps.exclude(pk=first.pk).delete()
                self.stdout.write(self.style.SUCCESS(f'Removed duplicate {provider_id} entries'))

            # Now update or create the single app
            app, created = SocialApp.objects.update_or_create(
                provider=provider_id,
                defaults={
                    'name': name,
                    'client_id': client_id,
                    'secret': secret,
                    'provider_id': provider_id,
                },
            )
            if created:
                app.sites.add(site)
                self.stdout.write(self.style.SUCCESS(f'Created {provider_id} SocialApp'))
            else:
                # Ensure site association always exists
                app.sites.add(site)
                self.stdout.write(self.style.SUCCESS(f'Updated {provider_id} SocialApp'))

        self.stdout.write(self.style.SUCCESS('All social apps are ready'))
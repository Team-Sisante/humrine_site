# affiliate/management/commands/import_affiliate_links.py

import csv
from django.core.management.base import BaseCommand
from affiliate.models import TrackedAffiliateLink

class Command(BaseCommand):
    help = 'Import affiliate links from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')

    def handle(self, *args, **options):
        file_path = options['csv_file']
        created = 0
        skipped = 0
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                slug = row.get('slug', '').strip()
                title = row.get('title', '').strip()
                original_url = row.get('original_url', '').strip()
                merchant = row.get('merchant', 'other').strip().lower()

                if not slug or not original_url:
                    self.stderr.write(f"Skipping row – missing slug or url: {row}")
                    skipped += 1
                    continue

                _, created_flag = TrackedAffiliateLink.objects.get_or_create(
                    slug=slug,
                    defaults={
                        'title': title,
                        'original_url': original_url,
                        'merchant': merchant,
                    }
                )
                if created_flag:
                    created += 1
                    self.stdout.write(f"Created: {slug}")
                else:
                    self.stdout.write(f"Already exists: {slug}")
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(f"Done. Created: {created}, Skipped: {skipped}"))
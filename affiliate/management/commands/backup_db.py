# affiliate/management/commands/backup_db.py
import os
import json
from datetime import datetime
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Backup the database to a JSON fixture file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            help='Directory to save the backup (default: data/backups/ relative to BASE_DIR)'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        if output_dir:
            backup_dir = os.path.abspath(output_dir)
        else:
            backup_dir = settings.BASE_DIR / 'data' / 'backups'

        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'db_backup_{timestamp}.json')

        with open(backup_file, 'w', encoding='utf-8') as f:
            call_command('dumpdata',
                         exclude=['contenttypes', 'sessions'],
                         format='json',
                         indent=2,
                         stdout=f)

        self.stdout.write(self.style.SUCCESS(f'Backup saved to {backup_file}'))
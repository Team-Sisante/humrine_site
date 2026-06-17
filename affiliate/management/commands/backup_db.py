# affiliate/management/commands/backup_db.py
import os
import json
from datetime import datetime
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Backup the database to a JSON fixture file'

    def handle(self, *args, **options):
        # Create backup directory if not exists
        backup_dir = settings.BASE_DIR / 'data' / 'backups'
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = backup_dir / f'db_backup_{timestamp}.json'

        # Dump all data except contenttypes and sessions (which can be recreated)
        with open(backup_file, 'w', encoding='utf-8') as f:
            call_command('dumpdata',
                         exclude=['contenttypes', 'sessions'],
                         format='json',
                         indent=2,
                         stdout=f)

        self.stdout.write(self.style.SUCCESS(f'Backup saved to {backup_file}'))
# affiliate/management/commands/restore_db.py
import os
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

class Command(BaseCommand):
    help = 'Restore the database from a JSON fixture backup'

    def add_arguments(self, parser):
        parser.add_argument('filename', type=str, help='Backup filename (e.g. db_backup_20260617_120000.json)')
        parser.add_argument('--yes', action='store_true', help='Skip confirmation prompt')

    def handle(self, *args, **options):
        backup_dir = settings.BASE_DIR / 'data' / 'backups'
        filepath = backup_dir / options['filename']

        if not filepath.exists():
            raise CommandError(f'Backup file not found: {filepath}')

        if not options['yes']:
            confirm = input(f'This will WIPE the current database and replace it with {filepath}. Continue? [y/N] ')
            if confirm.lower() != 'y':
                self.stdout.write('Aborted.')
                return

        # Flush database (remove all data)
        call_command('flush', '--noinput')

        # Load the backup
        with open(filepath, 'r', encoding='utf-8') as f:
            call_command('loaddata', filepath)

        self.stdout.write(self.style.SUCCESS(f'Database restored from {filepath}'))
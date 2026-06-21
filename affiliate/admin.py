# affiliate/admin.py

import csv
from io import TextIOWrapper
from datetime import datetime
import os

from django.contrib import admin
from django.shortcuts import redirect, render
from django.urls import path
from django import forms
from django.contrib import messages
from django.conf import settings
from django.core.management import call_command
from django.http import HttpResponse, FileResponse, Http404

from .models import TrackedAffiliateLink, AffiliateClick


class CSVUploadForm(forms.Form):
    csv_file = forms.FileField(label='CSV file')


class RestoreForm(forms.Form):
    filename = forms.ChoiceField(choices=[], label='Select Backup File')
    confirm = forms.BooleanField(required=True, label='I understand this will wipe the database')

    def __init__(self, *args, **kwargs):
        choices = kwargs.pop('choices', [])
        super().__init__(*args, **kwargs)
        self.fields['filename'].choices = choices


def get_backup_dir():
    backup_dir = os.path.join(settings.BASE_DIR, 'data', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


@admin.register(TrackedAffiliateLink)
class TrackedAffiliateLinkAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'merchant', 'created_at']
    search_fields = ['title', 'slug', 'original_url']
    prepopulated_fields = {'slug': ('title',)}
    change_list_template = 'admin/affiliate/change_list_with_import.html'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-csv/', self.admin_site.admin_view(self.import_csv), name='affiliate_import_csv'),
            path('export-csv/', self.admin_site.admin_view(self.export_csv), name='affiliate_export_csv'),
            path('backup/', self.admin_site.admin_view(self.backup_view), name='affiliate_backup'),
            path('restore/', self.admin_site.admin_view(self.restore_view), name='affiliate_restore'),
            path('download-backup/<path:filename>/', self.admin_site.admin_view(self.download_backup_view), name='affiliate_download_backup'),
        ]
        return custom_urls + urls

    def export_csv(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="affiliate_links.csv"'
        writer = csv.writer(response)
        writer.writerow(['slug', 'title', 'original_url', 'merchant', 'description', 'image_url', 'price'])
        for link in TrackedAffiliateLink.objects.all():
            writer.writerow([link.slug, link.title, link.original_url, link.merchant, link.description, link.image_url, link.price])
        return response

    def import_csv(self, request):
        if request.method == 'POST' and request.POST.get('confirm'):
            rows = request.session.get('import_csv_preview', [])
            if not rows:
                messages.error(request, 'No data to import.')
                return redirect('..')
            created = 0
            skipped = 0
            for row in rows:
                _, created_flag = TrackedAffiliateLink.objects.get_or_create(
                    slug=row['slug'],
                    defaults={
                        'title': row['title'],
                        'original_url': row['original_url'],
                        'merchant': row['merchant'],
                        'description': row['description'],
                        'image_url': row['image_url'],
                        'price': row['price'] or None,
                    }
                )
                if created_flag:
                    created += 1
                else:
                    skipped += 1
            messages.success(request, f"CSV imported. Created: {created}, Skipped (already existing): {skipped}")
            del request.session['import_csv_preview']
            return redirect('..')

        if request.method == 'POST':
            form = CSVUploadForm(request.POST, request.FILES)
            if form.is_valid():
                csv_file = request.FILES['csv_file']
                reader = csv.DictReader(TextIOWrapper(csv_file.file, encoding='utf-8'))
                rows = []
                invalid = 0
                for row in reader:
                    slug = row.get('slug', '').strip()
                    original_url = row.get('original_url', '').strip()
                    if not slug or not original_url:
                        invalid += 1
                        continue
                    rows.append({
                        'slug': slug,
                        'title': row.get('title', '').strip(),
                        'original_url': original_url,
                        'merchant': row.get('merchant', 'other').strip().lower(),
                        'description': row.get('description', '').strip(),
                        'image_url': row.get('image_url', '').strip(),
                        'price': row.get('price', '').strip() or None,
                    })
                if invalid:
                    messages.warning(request, f"{invalid} row(s) skipped – missing slug or URL.")
                request.session['import_csv_preview'] = rows
                context = dict(
                    self.admin_site.each_context(request),
                    title='Import affiliate links from CSV - Preview',
                    preview_rows=rows,
                )
                return render(request, 'admin/affiliate/import_csv.html', context)
        else:
            form = CSVUploadForm()

        context = dict(
            self.admin_site.each_context(request),
            form=form,
            title='Import affiliate links from CSV',
        )
        return render(request, 'admin/affiliate/import_csv.html', context)

    def backup_view(self, request):
        backup_dir = get_backup_dir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'db_backup_{timestamp}.json'
        filepath = os.path.join(backup_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            call_command('dumpdata', exclude=['contenttypes', 'sessions'], format='json', indent=2, stdout=f)

        messages.success(request, f'Backup saved as {filename}')
        return redirect('..')

    def restore_view(self, request):
        backup_dir = get_backup_dir()
        files = [f for f in os.listdir(backup_dir) if f.endswith('.json')]
        file_choices = [(f, f) for f in sorted(files, reverse=True)]

        if request.method == 'POST':
            form = RestoreForm(request.POST, choices=file_choices)
            if form.is_valid():
                filename = form.cleaned_data['filename']
                filepath = os.path.join(backup_dir, filename)
                if not os.path.exists(filepath):
                    messages.error(request, f'Backup file not found: {filename}')
                    return redirect('..')
                # Flush database and load the backup
                call_command('flush', '--noinput')
                call_command('loaddata', filepath)
                messages.success(request, f'Database restored from {filename}')
                return redirect('..')
        else:
            form = RestoreForm(choices=file_choices)

        context = dict(
            self.admin_site.each_context(request),
            form=form,
            title='Restore Database from Backup',
            files=files
        )
        return render(request, 'admin/affiliate/restore.html', context)

    def download_backup_view(self, request, filename):
        backup_dir = get_backup_dir()
        filepath = os.path.join(backup_dir, filename)
        if os.path.exists(filepath):
            return FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)
        raise Http404("Backup file not found.")


@admin.register(AffiliateClick)
class AffiliateClickAdmin(admin.ModelAdmin):
    list_display = ['link', 'clicked_at', 'ip_address', 'user_agent_short']
    list_filter = ['link', 'clicked_at']
    search_fields = ['ip_address', 'referer']
    readonly_fields = ['link', 'user', 'ip_address', 'user_agent', 'referer', 'clicked_at']
    date_hierarchy = 'clicked_at'

    @admin.display(description='User Agent')
    def user_agent_short(self, obj):
        return obj.user_agent[:80] if obj.user_agent else ''
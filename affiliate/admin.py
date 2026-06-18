# affiliate/admin.py

from django.contrib import admin
from django.shortcuts import redirect, render
from django.urls import path
from django import forms
from django.contrib import messages
import csv
from io import TextIOWrapper
from .models import TrackedAffiliateLink, AffiliateClick


class CSVUploadForm(forms.Form):
    csv_file = forms.FileField(label='CSV file')


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
        ]
        return custom_urls + urls

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

# affiliate/admin.py — add to TrackedAffiliateLinkAdmin
def get_urls(self):
    urls = super().get_urls()
    custom_urls = [
        path('import-csv/', self.admin_site.admin_view(self.import_csv), name='affiliate_import_csv'),
        path('backup/', self.admin_site.admin_view(self.backup_view), name='affiliate_backup'),
        path('restore/', self.admin_site.admin_view(self.restore_view), name='affiliate_restore'),
    ]
    return custom_urls + urls

def backup_view(self, request):
    from django.core.management import call_command
    import os
    from datetime import datetime
    backup_dir = settings.BASE_DIR / 'data' / 'backups'
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'db_backup_{timestamp}.json'
    with open(backup_file, 'w', encoding='utf-8') as f:
        call_command('dumpdata', exclude=['contenttypes', 'sessions'], format='json', indent=2, stdout=f)
    messages.success(request, f'Backup saved to {backup_file}')
    return redirect('..')

def restore_view(self, request):
    # Simple form to input filename and confirm
    from django import forms
    class RestoreForm(forms.Form):
        filename = forms.CharField(max_length=200)
        confirm = forms.BooleanField(required=True, label='I understand this will wipe the database')
    if request.method == 'POST':
        form = RestoreForm(request.POST)
        if form.is_valid():
            filename = form.cleaned_data['filename']
            backup_dir = settings.BASE_DIR / 'data' / 'backups'
            filepath = backup_dir / filename
            if not filepath.exists():
                messages.error(request, f'File not found: {filepath}')
            else:
                call_command('flush', '--noinput')
                call_command('loaddata', filepath)
                messages.success(request, f'Database restored from {filepath}')
                return redirect('..')
    else:
        form = RestoreForm()
    context = dict(self.admin_site.each_context(request), form=form, title='Restore Database')
    return render(request, 'admin/affiliate/restore.html', context)

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
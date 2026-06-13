# affiliate/management/commands/delete_affiliate_links.py
# How to use:
# # Delete by slug
# python manage.py delete_affiliate_links --slug shopee-test

# # Delete all Shopee links
# python manage.py delete_affiliate_links --merchant shopee

# # Delete everything (with confirmation)
# python manage.py delete_affiliate_links --all

# # Skip confirmation
# python manage.py delete_affiliate_links --slug test-mouse --yes

import sys
from django.core.management.base import BaseCommand
from affiliate.models import TrackedAffiliateLink

class Command(BaseCommand):
    help = 'Delete affiliate links by slug, merchant, or all'

    def add_arguments(self, parser):
        parser.add_argument('--slug', type=str, help='Delete link with this slug')
        parser.add_argument('--merchant', type=str, help='Delete all links for this merchant')
        parser.add_argument('--all', action='store_true', help='Delete ALL affiliate links')
        parser.add_argument('--yes', action='store_true', help='Skip confirmation')

    def handle(self, *args, **options):
        slug = options.get('slug')
        merchant = options.get('merchant')
        delete_all = options.get('all')
        auto_yes = options.get('yes')

        if not slug and not merchant and not delete_all:
            self.stderr.write("Specify --slug, --merchant, or --all.")
            sys.exit(1)

        queryset = TrackedAffiliateLink.objects.all()
        if slug:
            queryset = queryset.filter(slug=slug)
            label = f"link with slug '{slug}'"
        elif merchant:
            queryset = queryset.filter(merchant=merchant)
            label = f"all links with merchant '{merchant}'"
        else:
            label = "ALL affiliate links"

        count = queryset.count()
        if count == 0:
            self.stdout.write("No matching links found.")
            return

        if not auto_yes:
            confirm = input(f"Delete {label} ({count} link(s))? [y/N] ")
            if confirm.lower() != 'y':
                self.stdout.write("Aborted.")
                return

        queryset.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} link(s)."))
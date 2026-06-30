# profiles/tests.py
"""
Covers Phase 1 functionality: Profile auto-creation, profile_complete
computation, decorator behavior, dashboard rendering, and the previously-
broken adapter hook. Pulled forward from the Phase 6 plan since this is
all testing Phase 1 code specifically — engagement-gating tests (Phase 2)
will be added alongside that work.
"""

from django.contrib.auth import get_user_model
from django.core.files import File
from django.http import HttpResponse
from django.test import Client, RequestFactory, TestCase
from PIL import Image

from allauth.account.signals import user_signed_up

from blog.models import Post
from core.management.adapters import CustomEmailAdapter
from toons.models import ToonStory
from engagement.models import Comment, Reaction

from .decorators import require_completed_profile
from .models import Profile

User = get_user_model()


class ProfileModelTestCase(TestCase):
    def test_profile_auto_created_on_signup_signal(self):
        user = User.objects.create_user(username='u1', email='u1@example.com', password='x')
        user_signed_up.send(sender=user.__class__, request=None, user=user)
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_new_profile_starts_incomplete(self):
        user = User.objects.create_user(username='u2', email='u2@example.com', password='x')
        user_signed_up.send(sender=user.__class__, request=None, user=user)
        profile = Profile.objects.get(user=user)
        self.assertEqual(profile.display_name, '')
        self.assertFalse(profile.profile_complete)

    def test_profile_complete_once_display_name_set(self):
        user = User.objects.create_user(username='u3', email='u3@example.com', password='x')
        profile = Profile.objects.create(user=user, display_name='Real Name')
        self.assertTrue(profile.profile_complete)

    def test_whitespace_only_display_name_not_complete(self):
        user = User.objects.create_user(username='u4', email='u4@example.com', password='x')
        profile = Profile.objects.create(user=user, display_name='   ')
        self.assertFalse(profile.profile_complete)

    def test_avatar_resized_on_save(self):
        user = User.objects.create_user(username='u5', email='u5@example.com', password='x')
        profile = Profile.objects.create(user=user, display_name='Has Avatar')
        img = Image.new('RGB', (1200, 1200), color=(100, 150, 200))
        path = '/tmp/test_profile_avatar.jpg'
        img.save(path, format='JPEG')
        with open(path, 'rb') as f:
            profile.avatar.save('avatar.jpg', File(f), save=True)
        resized = Image.open(profile.avatar.path)
        self.assertEqual(resized.width, Profile.AVATAR_MAX_WIDTH)


class RequireCompletedProfileDecoratorTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='dec1', email='dec1@example.com', password='x')
        self.factory = RequestFactory()

    def _request_with_session(self, path='/protected/'):
        req = self.factory.get(path)
        req.user = self.user
        from django.contrib.sessions.middleware import SessionMiddleware
        SessionMiddleware(lambda r: None).process_request(req)
        req.session.save()
        return req

    def test_redirects_and_stashes_url_when_incomplete(self):
        @require_completed_profile
        def view(request):
            return HttpResponse('OK')

        req = self._request_with_session('/some/protected/path/')
        resp = view(req)
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp['Location'], '/profile/complete/')
        self.assertEqual(req.session.get('profile_next'), '/some/protected/path/')

    def test_lazily_creates_profile_if_missing(self):
        self.assertFalse(Profile.objects.filter(user=self.user).exists())

        @require_completed_profile
        def view(request):
            return HttpResponse('OK')

        view(self._request_with_session())
        self.assertTrue(Profile.objects.filter(user=self.user).exists())

    def test_passes_through_once_complete(self):
        Profile.objects.create(user=self.user, display_name='Complete User')

        @require_completed_profile
        def view(request):
            return HttpResponse('PROTECTED CONTENT')

        resp = view(self._request_with_session())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, b'PROTECTED CONTENT')


class DashboardAndCompleteProfileViewTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='view1', email='view1@example.com', password='testpass123')
        self.client.force_login(self.user)

    def test_dashboard_accessible_with_incomplete_profile(self):
        resp = self.client.get('/dashboard/')
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'Complete your profile')

    def test_complete_profile_rejects_empty_name(self):
        resp = self.client.post('/profile/complete/', {'display_name': '   ', 'bio': ''})
        self.assertEqual(resp.status_code, 200)  # re-renders form, doesn't redirect
        profile = Profile.objects.get(user=self.user)
        self.assertFalse(profile.profile_complete)

    def test_complete_profile_succeeds_and_redirects_to_dashboard_by_default(self):
        resp = self.client.post('/profile/complete/', {'display_name': 'Real Name', 'bio': ''})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp['Location'], '/dashboard/')
        profile = Profile.objects.get(user=self.user)
        self.assertTrue(profile.profile_complete)

    def test_dashboard_no_longer_nudges_once_complete(self):
        Profile.objects.create(user=self.user, display_name='Done')
        resp = self.client.get('/dashboard/')
        self.assertNotContains(resp, 'Complete your profile')
        self.assertContains(resp, 'Done')

    def test_dashboard_lists_own_comments_and_reactions(self):
        post = Post.objects.create(title='Dashboard Test Post', body='<p>x</p>')
        story = ToonStory.objects.create(title='Dashboard Test Story', description='d')
        Comment.objects.create(author=self.user, content_object=post, body='My comment')
        Reaction.objects.create(user=self.user, content_object=story, reaction_type='HEART')

        resp = self.client.get('/dashboard/')
        self.assertContains(resp, 'My comment')
        self.assertContains(resp, 'Dashboard Test Post')
        self.assertContains(resp, 'Dashboard Test Story')

    def test_dashboard_skips_comments_on_deleted_content(self):
        post = Post.objects.create(title='To Be Deleted', body='<p>x</p>')
        Comment.objects.create(author=self.user, content_object=post, body='Orphan comment')
        post.delete()  # GenericForeignKey doesn't cascade — comment row survives, content_object becomes None

        resp = self.client.get('/dashboard/')
        self.assertEqual(resp.status_code, 200)  # must not 500
        self.assertNotContains(resp, 'Orphan comment')


class ProfileCompletionAdapterTestCase(TestCase):
    """Covers the previously-missing _check_profile_completion method that
    CustomSocialAccountAdapter.get_login_redirect_url already called — every
    social login redirect would have raised AttributeError before this."""

    def setUp(self):
        self.user = User.objects.create_user(username='adapter1', email='adapter1@example.com', password='x')
        self.factory = RequestFactory()
        self.adapter = CustomEmailAdapter()

    def test_redirects_incomplete_profile_to_completion_page(self):
        req = self.factory.get('/')
        req.user = self.user
        result = self.adapter._check_profile_completion(req, '/dashboard/')
        self.assertEqual(result, '/profile/complete/')

    def test_passes_through_original_url_once_complete(self):
        Profile.objects.create(user=self.user, display_name='Adapter Test')
        req = self.factory.get('/')
        req.user = self.user
        result = self.adapter._check_profile_completion(req, '/dashboard/')
        self.assertEqual(result, '/dashboard/')

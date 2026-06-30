# engagement/tests.py

from django.contrib.auth import get_user_model
from django.test import TestCase

from blog.models import Post
from profiles.models import Profile

from .models import Comment, Reaction

User = get_user_model()


class EngagementTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='reader1', password='testpass123')
        self.other_user = User.objects.create_user(username='reader2', password='testpass123')
        # Phase 2 gates comment/reaction behind a completed profile (see
        # profiles/decorators.py) — without this, every test below would
        # 403 instead of exercising actual comment/reaction behavior.
        # Gating itself is covered separately, in EngagementProfileGatingTestCase.
        Profile.objects.create(user=self.user, display_name='Reader One')
        Profile.objects.create(user=self.other_user, display_name='Reader Two')
        self.post = Post.objects.create(title='Test Post', body='<p>hello</p>')

    def _login(self, user=None):
        user = user or self.user
        self.client.force_login(user)

    # --- Comments ---

    def test_anonymous_cannot_comment(self):
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/', {'body': 'hi'},
        )
        self.assertEqual(resp.status_code, 302)  # redirected to login
        self.assertEqual(Comment.objects.count(), 0)

    def test_authenticated_user_can_comment(self):
        self._login()
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/',
            {'body': 'Great post!'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Comment.objects.count(), 1)
        comment = Comment.objects.first()
        self.assertEqual(comment.author, self.user)
        self.assertEqual(comment.body, 'Great post!')
        self.assertEqual(comment.content_object, self.post)

    def test_empty_comment_rejected(self):
        self._login()
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/',
            {'body': ''},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Comment.objects.count(), 0)

    def test_comment_appears_on_post_detail_page(self):
        self._login()
        Comment.objects.create(author=self.user, content_object=self.post, body='Nice!')
        resp = self.client.get(f'/blog/{self.post.slug}/')
        self.assertContains(resp, 'Nice!')

    def test_hidden_comment_does_not_appear(self):
        self._login()
        Comment.objects.create(
            author=self.user, content_object=self.post, body='Spam', is_hidden=True,
        )
        resp = self.client.get(f'/blog/{self.post.slug}/')
        self.assertNotContains(resp, 'Spam')

    # --- Reactions ---

    def test_anonymous_cannot_react(self):
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/', {'reaction_type': 'HEART'},
        )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Reaction.objects.count(), 0)

    def test_authenticated_user_can_react(self):
        self._login()
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['user_reaction'], 'HEART')
        self.assertEqual(data['counts']['HEART'], 1)
        self.assertEqual(Reaction.objects.count(), 1)

    def test_clicking_same_reaction_again_removes_it(self):
        self._login()
        url = f'/engagement/react/blog/post/{self.post.pk}/'
        self.client.post(url, {'reaction_type': 'HEART'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        resp = self.client.post(url, {'reaction_type': 'HEART'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        data = resp.json()
        self.assertIsNone(data['user_reaction'])
        self.assertEqual(Reaction.objects.count(), 0)

    def test_switching_reaction_type_replaces_not_stacks(self):
        self._login()
        url = f'/engagement/react/blog/post/{self.post.pk}/'
        self.client.post(url, {'reaction_type': 'HEART'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        resp = self.client.post(url, {'reaction_type': 'LAUGH'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        data = resp.json()
        self.assertEqual(data['user_reaction'], 'LAUGH')
        self.assertEqual(data['counts']['HEART'], 0)
        self.assertEqual(data['counts']['LAUGH'], 1)
        # Still just ONE row for this user on this object, not two.
        self.assertEqual(Reaction.objects.filter(user=self.user, object_id=self.post.pk).count(), 1)

    def test_invalid_reaction_type_rejected(self):
        self._login()
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'NOT_A_REAL_TYPE'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 400)

    def test_two_different_users_can_each_react(self):
        self.client.force_login(self.user)
        self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.client.logout()
        self.client.force_login(self.other_user)
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.json()['counts']['HEART'], 2)


class EngagementProfileGatingTestCase(TestCase):
    """
    Phase 2: comment/reaction actions require a completed profile, not just
    being logged in. This is separate from EngagementTestCase above, which
    deliberately gives its users completed profiles up front so it can
    keep testing comment/reaction behavior in isolation from this gating.
    """

    def setUp(self):
        # Deliberately NOT creating a Profile here — covers both "no
        # Profile row exists at all" (decorator's get_or_create path) and,
        # in a couple of tests below, "Profile exists but display_name is
        # blank" (the more common real-world case, e.g. right after signup).
        self.user = User.objects.create_user(username='incomplete1', password='testpass123')
        self.post = Post.objects.create(title='Gating Test Post', body='<p>hi</p>')
        self.client.force_login(self.user)

    def test_ajax_comment_blocked_with_structured_json(self):
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/',
            {'body': 'Trying to comment'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 403)
        data = resp.json()
        self.assertTrue(data['profile_incomplete'])
        self.assertEqual(data['redirect'], '/profile/complete/')
        self.assertEqual(Comment.objects.count(), 0)

    def test_ajax_reaction_blocked_with_structured_json(self):
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(resp.json()['profile_incomplete'])
        self.assertEqual(Reaction.objects.count(), 0)

    def test_non_ajax_comment_gets_real_redirect_not_json(self):
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/', {'body': 'No JS fallback'},
        )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp['Location'], '/profile/complete/')

    def test_profile_next_uses_referer_not_the_api_endpoint_itself(self):
        # The gated views are POST-only API endpoints, not real pages — if
        # profile_next stashed the endpoint URL itself, completing your
        # profile would try to GET a @require_POST-only endpoint and 405.
        self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_REFERER=f'http://testserver/blog/{self.post.slug}/',
        )
        self.assertEqual(
            self.client.session.get('profile_next'),
            f'http://testserver/blog/{self.post.slug}/',
        )

    def test_profile_next_falls_back_to_path_without_referer(self):
        self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'HEART'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(
            self.client.session.get('profile_next'),
            f'/engagement/react/blog/post/{self.post.pk}/',
        )

    def test_full_loop_blocked_then_completed_then_succeeds(self):
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'LIKE'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_REFERER=f'http://testserver/blog/{self.post.slug}/',
        )
        redirect_target = resp.json()['redirect']

        # Follow it, like the JS would via window.location.href
        self.client.get(redirect_target)

        # Complete the profile
        complete_resp = self.client.post(
            '/profile/complete/', {'display_name': 'Now Complete', 'bio': ''},
        )
        self.assertTrue(complete_resp['Location'].endswith(f'/blog/{self.post.slug}/'))

        # Retry the original action — should succeed now
        retry_resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/',
            {'reaction_type': 'LIKE'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(retry_resp.status_code, 200)
        self.assertTrue(retry_resp.json()['ok'])
        self.assertEqual(Reaction.objects.count(), 1)

    def test_blank_display_name_profile_still_blocked(self):
        # Common real-world case: Profile row exists (created by the
        # signup signal) but display_name was never filled in.
        Profile.objects.create(user=self.user, display_name='')
        resp = self.client.post(
            f'/engagement/comment/blog/post/{self.post.pk}/',
            {'body': 'still incomplete'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(resp.status_code, 403)

    def test_anonymous_users_unaffected_by_gating_change(self):
        # Anonymous users should still get login_required's redirect, not
        # the gating decorator's response — login_required runs first.
        self.client.logout()
        resp = self.client.post(
            f'/engagement/react/blog/post/{self.post.pk}/', {'reaction_type': 'HEART'},
        )
        self.assertEqual(resp.status_code, 302)
        self.assertIn('/accounts/login/', resp['Location'])

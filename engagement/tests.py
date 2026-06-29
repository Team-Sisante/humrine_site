# engagement/tests.py

from django.contrib.auth import get_user_model
from django.test import TestCase

from blog.models import Post
from .models import Comment, Reaction

User = get_user_model()


class EngagementTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='reader1', password='testpass123')
        self.other_user = User.objects.create_user(username='reader2', password='testpass123')
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

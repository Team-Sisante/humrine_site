from django.core.files import File
from django.test import TestCase
from PIL import Image

from .models import Post, PostImage


class ImageResizeTestCase(TestCase):
    def _make_test_image(self, path, size=(1885, 2048), mode='RGB', fmt='JPEG'):
        img = Image.new(mode, size, color=(120, 160, 200) if mode == 'RGB' else (50, 50, 50, 128))
        img.save(path, format=fmt)

    def test_post_image_downscaled_to_max_width(self):
        path = '/tmp/test_blog_post_image.jpg'
        self._make_test_image(path)
        post = Post(title='Resize Test', body='<p>x</p>')
        with open(path, 'rb') as f:
            post.image.save('big.jpg', File(f), save=True)
        img = Image.open(post.image.path)
        self.assertEqual(img.width, Post.IMAGE_MAX_WIDTH)
        # Aspect ratio preserved
        self.assertAlmostEqual(img.height, round(2048 * (1200 / 1885)), delta=1)

    def test_post_image_under_max_width_untouched(self):
        path = '/tmp/test_blog_post_small.jpg'
        self._make_test_image(path, size=(400, 300))
        post = Post(title='Small Image Test', body='<p>x</p>')
        with open(path, 'rb') as f:
            post.image.save('small.jpg', File(f), save=True)
        img = Image.open(post.image.path)
        self.assertEqual(img.width, 400)
        self.assertEqual(img.height, 300)

    def test_post_image_resave_is_idempotent(self):
        path = '/tmp/test_blog_post_resave.jpg'
        self._make_test_image(path)
        post = Post(title='Resave Test', body='<p>x</p>')
        with open(path, 'rb') as f:
            post.image.save('resave.jpg', File(f), save=True)
        post.title = 'Renamed'
        post.save()
        img = Image.open(post.image.path)
        self.assertEqual(img.width, Post.IMAGE_MAX_WIDTH)

    def test_post_image_png_transparency_preserved(self):
        path = '/tmp/test_blog_transparent.png'
        self._make_test_image(path, size=(1600, 1200), mode='RGBA', fmt='PNG')
        post = Post(title='PNG Test', body='<p>x</p>')
        with open(path, 'rb') as f:
            post.image.save('transparent.png', File(f), save=True)
        img = Image.open(post.image.path)
        self.assertEqual(img.width, Post.IMAGE_MAX_WIDTH)
        self.assertEqual(img.mode, 'RGBA')
        self.assertLess(img.getpixel((10, 10))[3], 255)  # still has alpha, not flattened opaque

    def test_post_image_field_downscaled(self):
        path = '/tmp/test_blog_postimage.jpg'
        self._make_test_image(path)
        post = Post.objects.create(title='Gallery Test', body='<p>x</p>')
        post_image = PostImage(post=post)
        with open(path, 'rb') as f:
            post_image.image.save('gallery.jpg', File(f), save=True)
        img = Image.open(post_image.image.path)
        self.assertEqual(img.width, PostImage.IMAGE_MAX_WIDTH)

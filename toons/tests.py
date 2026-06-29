from django.core.files import File
from django.test import TestCase
from PIL import Image

from .models import ToonStory, ToonPanel


class ToonPanelImageResizeTestCase(TestCase):
    def _make_test_image(self, path, size=(1885, 2048)):
        img = Image.new('RGB', size, color=(120, 160, 200))
        img.save(path, format='JPEG')

    def test_panel_image_downscaled_to_max_width(self):
        path = '/tmp/test_toon_panel.jpg'
        self._make_test_image(path)
        story = ToonStory.objects.create(title='Resize Test Story', description='d')
        panel = ToonPanel(story=story, order=1)
        with open(path, 'rb') as f:
            panel.image.save('panel.jpg', File(f), save=True)
        img = Image.open(panel.image.path)
        self.assertEqual(img.width, ToonPanel.IMAGE_MAX_WIDTH)
        self.assertAlmostEqual(img.height, round(2048 * (800 / 1885)), delta=1)

    def test_panel_image_under_max_width_untouched(self):
        path = '/tmp/test_toon_panel_small.jpg'
        self._make_test_image(path, size=(400, 300))
        story = ToonStory.objects.create(title='Small Panel Story', description='d')
        panel = ToonPanel(story=story, order=1)
        with open(path, 'rb') as f:
            panel.image.save('small_panel.jpg', File(f), save=True)
        img = Image.open(panel.image.path)
        self.assertEqual(img.width, 400)

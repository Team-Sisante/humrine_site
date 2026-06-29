# humrine_site/settings/ckeditor.py

"""
CKEditor configuration
"""

import os

CKEDITOR_UPLOAD_PATH = "uploads/"
CKEDITOR_IMAGE_BACKEND = "pillow"

CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': [
            ['Source', 'Maximize'],
            ['Undo', 'Redo'],
            ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript'],
            ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', 'Blockquote'],
            ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
            ['Link', 'Unlink', 'Anchor'],
            ['Image', 'Table', 'HorizontalRule', 'SpecialChar'],
            ['Format', 'Font', 'FontSize'],
            ['TextColor', 'BGColor'],
            ['RemoveFormat'],
        ],
        'height': 400,
        'width': '100%',
        'extraPlugins': ','.join(['sourcearea', 'sourcedialog', 'image2', 'uploadimage', 'resize', 'maximize']),
        'removePlugins': 'image',
        'sourcearea_plugin': 'sourcedialog',
        'image2_alignClasses': ['image-left', 'image-center', 'image-right'],
        'image2_captions': True,
        'image2_disableResizer': False,
    },
    'toons': {
        'toolbar': [
            ['Source', 'Maximize'],
            ['Undo', 'Redo'],
            ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript'],
            ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', 'Blockquote'],
            ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
            ['Link', 'Unlink', 'Anchor'],
            ['Image', 'Table', 'HorizontalRule', 'SpecialChar'],
            ['Format', 'Font', 'FontSize'],
            ['TextColor', 'BGColor'],
            ['RemoveFormat'],
        ],
        'height': 400,
        'width': '100%',
        'extraPlugins': ','.join(['sourcearea', 'image2', 'uploadimage', 'resize', 'maximize']),
        'removePlugins': 'image',
        'image2_alignClasses': ['image-left', 'image-center', 'image-right'],
        'image2_captions': True,
        'image2_disableResizer': False,
    },
}

CKEDITOR_BASEPATH = "https://cdn.ckeditor.com/4.22.1/full-all/"
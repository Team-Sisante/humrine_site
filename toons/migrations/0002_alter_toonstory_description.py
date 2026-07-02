# Generated migration: toons 0002
# Changes ToonStory.description from TextField to RichTextUploadingField.
# Safe at the database level — both map to a text column, no data loss.
# Only the admin widget changes (plain textarea → CKEditor with upload support).

from django.db import migrations
import ckeditor_uploader.fields


class Migration(migrations.Migration):

    dependencies = [
        ('toons', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='toonstory',
            name='description',
            field=ckeditor_uploader.fields.RichTextUploadingField(
                blank=True,
                config_name='toons',
            ),
        ),
    ]

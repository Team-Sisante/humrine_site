# engagement/forms.py
"""
Deliberately a plain Textarea — NOT CKEditor — for visitor comments.
Full WYSIWYG is appropriate for admin-authored blog/toon content, not
for unmoderated visitor input (stored-XSS risk). See task doc security note.
"""

from django import forms

from .models import Comment


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['body']
        widgets = {
            'body': forms.Textarea(attrs={
                'rows': 3,
                'maxlength': 2000,
                'placeholder': 'Share your thoughts...',
                'class': 'form-control',
            }),
        }
        labels = {'body': ''}

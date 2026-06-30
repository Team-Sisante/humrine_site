# profiles/forms.py

from django import forms

from .models import Profile


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['display_name', 'avatar', 'bio']
        widgets = {
            'display_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'How should we show your name on comments?',
                'maxlength': 80,
            }),
            'avatar': forms.ClearableFileInput(attrs={'class': 'form-control'}),
            'bio': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'maxlength': 280,
                'placeholder': 'A short line about yourself (optional)',
            }),
        }

    def clean_display_name(self):
        display_name = self.cleaned_data['display_name'].strip()
        if not display_name:
            raise forms.ValidationError('Please enter a display name — it’s what shows on your comments.')
        return display_name

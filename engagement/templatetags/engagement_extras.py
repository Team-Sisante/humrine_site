from django import template

register = template.Library()


@register.filter
def get_item(dictionary, key):
    """Usage: {{ reaction_counts|get_item:code }} — dict lookup with a variable key."""
    return dictionary.get(key, 0)

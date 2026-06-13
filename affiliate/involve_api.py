# affiliate/involve_api.py

import requests
from django.core.cache import cache
from django.conf import settings

BASE_URL = "https://api.involve.asia/v1"

class InvolveAPI:
    @staticmethod
    def _headers():
        return {
            "Authorization": f"Bearer {settings.INVOLVE_API_KEY}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def get_offers(category=None, search=None, limit=20, page=1):
        cache_key = f"involve_offers_{category}_{search}_{limit}_{page}"
        data = cache.get(cache_key)
        if data:
            return data
        params = {"limit": limit, "page": page}
        if category:
            params["category"] = category
        if search:
            params["search"] = search
        resp = requests.get(f"{BASE_URL}/publisher/offers", headers=InvolveAPI._headers(), params=params)
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data, timeout=3600)  # cache 1 hour
        return data

    @staticmethod
    def generate_deep_link(offer_id, url=None):
        payload = {"offer_id": offer_id}
        if url:
            payload["url"] = url
        resp = requests.post(f"{BASE_URL}/publisher/deeplink", headers=InvolveAPI._headers(), json=payload)
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def get_categories():
        cache_key = "involve_categories"
        data = cache.get(cache_key)
        if data:
            return data
        resp = requests.get(f"{BASE_URL}/publisher/categories", headers=InvolveAPI._headers())
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data, timeout=86400)  # 24 hours
        return data
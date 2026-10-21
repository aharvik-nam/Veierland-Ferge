"""Felles hjelpefunksjoner for App Store Connect API (brukes av iOS-byggene i GitHub Actions).

Leser ASC_KEY_PATH, KEY_ID og ISSUER_ID fra miljøet.
"""
import json
import os
import time
import urllib.error
import urllib.request

import jwt  # PyJWT

API = 'https://api.appstoreconnect.apple.com/v1'


def token() -> str:
    with open(os.environ['ASC_KEY_PATH']) as f:
        private_key = f.read()
    now = int(time.time())
    return jwt.encode(
        {'iss': os.environ['ISSUER_ID'], 'iat': now, 'exp': now + 900, 'aud': 'appstoreconnect-v1'},
        private_key, algorithm='ES256', headers={'kid': os.environ['KEY_ID'], 'typ': 'JWT'},
    )


def call(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    req = urllib.request.Request(
        API + path, method=method, data=json.dumps(body).encode() if body else None,
        headers={'Authorization': f'Bearer {token()}', 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}


def details(resp: dict) -> str:
    return ' '.join(err.get('detail', err.get('title', '')) for err in resp.get('errors', []))

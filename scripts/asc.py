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
    # iat litt tilbake i tid, så en klokke som går litt for fort ikke gir 401 (levetid under Apples grense på 20 min)
    return jwt.encode(
        {'iss': os.environ['ISSUER_ID'], 'iat': now - 60, 'exp': now + 900, 'aud': 'appstoreconnect-v1'},
        private_key, algorithm='ES256', headers={'kid': os.environ['KEY_ID'], 'typ': 'JWT'},
    )


def call(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    # Apple svarer av og til 401 eller 5xx en kort stund selv om nøkkelen er i orden: prøv opptil tre ganger.
    # POST gjentas bare når Apple avviste forespørselen (401/429), så ingenting lages to ganger.
    retry = {401, 429} if method == 'POST' else {401, 429, 500, 502, 503, 504}
    for attempt in range(3):
        if attempt:
            print(f'  Apple svarte {status}, prøver igjen om {15 * attempt} s …')
            time.sleep(15 * attempt)
        status, resp = _call_once(method, path, body)
        if status not in retry:
            break
    return status, resp


def _call_once(method: str, path: str, body: dict | None) -> tuple[int, dict]:
    req = urllib.request.Request(
        API + path, method=method, data=json.dumps(body).encode() if body else None,
        headers={'Authorization': f'Bearer {token()}', 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}
    except (urllib.error.URLError, TimeoutError) as e:
        print(f'  Fikk ikke kontakt med Apple ({e})')
        return 503, {}


def details(resp: dict) -> str:
    return ' '.join(err.get('detail', err.get('title', '')) for err in resp.get('errors', []))

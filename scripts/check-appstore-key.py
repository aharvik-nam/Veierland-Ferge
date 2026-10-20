"""Sjekker App Store Connect-nøkkelen før iOS-bygget, og gir tydelige feilmeldinger.

Registrerer også app-ID-en (bundle ID) automatisk hvis den mangler.
Leser ASC_KEY_PATH, KEY_ID, ISSUER_ID og BUNDLE_ID fra miljøet.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

import jwt  # PyJWT

API = 'https://api.appstoreconnect.apple.com/v1'
key_id = os.environ['KEY_ID']
issuer = os.environ['ISSUER_ID']
bundle_id = os.environ['BUNDLE_ID']

with open(os.environ['ASC_KEY_PATH']) as f:
    private_key = f.read()

if 'BEGIN PRIVATE KEY' not in private_key:
    print('::error::APPSTORE_KEY_P8 ser ikke ut som en .p8-nøkkel. Lim inn hele filen, også linjene -----BEGIN PRIVATE KEY----- og -----END PRIVATE KEY-----.')
    sys.exit(1)

try:
    token = jwt.encode(
        {'iss': issuer, 'iat': int(time.time()), 'exp': int(time.time()) + 600, 'aud': 'appstoreconnect-v1'},
        private_key, algorithm='ES256', headers={'kid': key_id, 'typ': 'JWT'},
    )
except Exception as e:  # ugyldig nøkkelinnhold
    print(f'::error::Klarte ikke å lese .p8-nøkkelen ({e}). Lim inn hele innholdet i APPSTORE_KEY_P8 på nytt.')
    sys.exit(1)


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}


def details(resp):
    return ' '.join(err.get('detail', err.get('title', '')) for err in resp.get('errors', []))


status, resp = call('GET', f'/bundleIds?filter[identifier]={bundle_id}')
if status == 401:
    print('::error::Apple godtok ikke nøkkelen (401). Sjekk at APPSTORE_KEY_ID og APPSTORE_ISSUER_ID hører til samme nøkkel som .p8-filen, og at det er en «Team Key» (ikke «Individual Key»).')
    sys.exit(1)
if status == 403:
    print(f'::error::Nøkkelen mangler tilgang (403): {details(resp)} – Bruk en Team Key med rollen Admin, og sjekk at nyeste avtale er godtatt i App Store Connect (Business / Agreements).')
    sys.exit(1)
if status != 200:
    print(f'::error::Uventet svar fra Apple ({status}): {details(resp)}')
    sys.exit(1)
print('✓ Nøkkelen fungerer')

matches = [b for b in resp.get('data', []) if b['attributes']['identifier'] == bundle_id]
if not matches:
    status, resp = call('POST', '/bundleIds', {'data': {'type': 'bundleIds', 'attributes': {
        'identifier': bundle_id, 'name': 'Veierland Ferge', 'platform': 'IOS'}}})
    if status != 201:
        print(f'::error::Klarte ikke å registrere app-ID {bundle_id} ({status}): {details(resp)}')
        sys.exit(1)
    print(f'✓ Registrerte app-ID {bundle_id}')
else:
    print(f'✓ App-ID {bundle_id} finnes')

status, resp = call('GET', f'/apps?filter[bundleId]={bundle_id}')
if status == 200 and not resp.get('data'):
    print(f'::warning::Appen finnes ikke i App Store Connect ennå. Opprett den (Apps → + → New App, bundle ID {bundle_id}) før opplastingen, ellers feiler siste steg.')
elif status == 200:
    print('✓ Appen finnes i App Store Connect')

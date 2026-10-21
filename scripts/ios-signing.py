"""Lager signering for App Store-bygget via App Store Connect API, og rydder opp etterpå.

  python3 scripts/ios-signing.py setup    sertifikat + profil + nøkkelring, og manuell signering i Xcode-prosjektet
  python3 scripts/ios-signing.py cleanup  sletter profilen, trekker tilbake sertifikatet og fjerner nøkkelringen

Sertifikatet lages på nytt for hvert bygg, siden den private nøkkelen ikke kan lagres i et offentlig repo.
Leser ASC_KEY_PATH, KEY_ID, ISSUER_ID, BUNDLE_ID, RUNNER_TEMP og GITHUB_ENV fra miljøet.
"""
import base64
import os
import re
import secrets
import subprocess
import sys
import urllib.request
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

from asc import call, details

PROJECT = Path('ios/App/App.xcodeproj/project.pbxproj')
PROFILE_PREFIX = 'Veierland Ferge CI'
WWDR_G3 = 'https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer'

tmp = Path(os.environ.get('RUNNER_TEMP', '/tmp'))
keychain = tmp / 'signing.keychain-db'


def fail(msg: str):
    print(f'::error::{msg}')
    sys.exit(1)


def export_env(name: str, value: str):
    # Skrives med en gang, så opprydningen finner det selv om et senere steg feiler
    with open(os.environ['GITHUB_ENV'], 'a') as f:
        f.write(f'{name}={value}\n')
    os.environ[name] = value


def sh(*args: str):
    subprocess.run(args, check=True)


def create_certificate():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Veierland Ferge CI')]))
           .sign(key, hashes.SHA256()))
    status, resp = call('POST', '/certificates', {'data': {'type': 'certificates', 'attributes': {
        'certificateType': 'DISTRIBUTION',
        'csrContent': csr.public_bytes(serialization.Encoding.PEM).decode()}}})
    if status == 403:
        fail(f'Nøkkelen får ikke lage sertifikater (403): {details(resp)} – API-nøkkelen må ha rollen Admin.')
    if status == 409:
        _, existing = call('GET', '/certificates?filter[certificateType]=DISTRIBUTION&limit=20')
        names = ', '.join(f"{c['attributes'].get('displayName')} (utløper {c['attributes'].get('expirationDate', '')[:10]})"
                          for c in existing.get('data', []))
        fail(f'Apple tillater ikke flere distribusjonssertifikater ({details(resp)}). '
             f'Trekk tilbake gamle under developer.apple.com/account/resources/certificates og prøv igjen. Finnes nå: {names}')
    if status != 201:
        fail(f'Klarte ikke å lage sertifikat ({status}): {details(resp)}')
    export_env('CERT_ID', resp['data']['id'])
    cert = x509.load_der_x509_certificate(base64.b64decode(resp['data']['attributes']['certificateContent']))
    team = cert.subject.get_attributes_for_oid(NameOID.ORGANIZATIONAL_UNIT_NAME)[0].value
    print(f'✓ Lagde distribusjonssertifikat (utløper {cert.not_valid_after_utc:%Y-%m-%d})')
    return key, cert, team


def install_in_keychain(key, cert):
    password = secrets.token_hex(16)
    # Gammel kryptering (3DES/SHA1), som macOS sin «security import» godtar
    encryption = (serialization.PrivateFormat.PKCS12.encryption_builder()
                  .kdf_rounds(50000)
                  .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC)
                  .hmac_hash(hashes.SHA1())
                  .build(password.encode()))
    p12 = tmp / 'distribution.p12'
    p12.write_bytes(pkcs12.serialize_key_and_certificates(b'distribution', key, cert, None, encryption))

    wwdr = tmp / 'AppleWWDRCAG3.cer'
    urllib.request.urlretrieve(WWDR_G3, wwdr)

    keychain_pw = secrets.token_hex(16)
    sh('security', 'create-keychain', '-p', keychain_pw, str(keychain))
    sh('security', 'set-keychain-settings', '-lut', '21600', str(keychain))
    sh('security', 'unlock-keychain', '-p', keychain_pw, str(keychain))
    sh('security', 'import', str(p12), '-P', password, '-A', '-t', 'cert', '-f', 'pkcs12', '-k', str(keychain))
    sh('security', 'import', str(wwdr), '-k', str(keychain))
    subprocess.run(['security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s',
                    '-k', keychain_pw, str(keychain)], check=True, stdout=subprocess.DEVNULL)
    sh('security', 'list-keychains', '-d', 'user', '-s', str(keychain), 'login.keychain-db')
    p12.unlink()
    print('✓ Sertifikatet ligger i en midlertidig nøkkelring')


def create_profile(bundle_id: str, cert_id: str) -> str:
    status, resp = call('GET', f'/bundleIds?filter[identifier]={bundle_id}')
    matches = [b for b in resp.get('data', []) if b['attributes']['identifier'] == bundle_id]
    if status != 200 or not matches:
        fail(f'Fant ikke app-ID {bundle_id} ({status}): {details(resp)}')

    # Fjern profiler som en tidligere kjøring ikke fikk ryddet bort
    _, old = call('GET', '/profiles?filter[profileType]=IOS_APP_STORE&limit=200')
    for p in old.get('data', []):
        if p['attributes']['name'].startswith(PROFILE_PREFIX):
            call('DELETE', f"/profiles/{p['id']}")

    name = f"{PROFILE_PREFIX} {os.environ.get('GITHUB_RUN_NUMBER', 'lokal')}"
    status, resp = call('POST', '/profiles', {'data': {
        'type': 'profiles',
        'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
        'relationships': {
            'bundleId': {'data': {'type': 'bundleIds', 'id': matches[0]['id']}},
            'certificates': {'data': [{'type': 'certificates', 'id': cert_id}]},
        }}})
    if status != 201:
        fail(f'Klarte ikke å lage provisioning-profil ({status}): {details(resp)}')
    export_env('PROFILE_ID', resp['data']['id'])
    content = base64.b64decode(resp['data']['attributes']['profileContent'])
    uuid = resp['data']['attributes']['uuid']
    # Xcode 16+ leser fra UserData, eldre versjoner fra MobileDevice
    for folder in ('Library/Developer/Xcode/UserData/Provisioning Profiles', 'Library/MobileDevice/Provisioning Profiles'):
        target = Path.home() / folder
        target.mkdir(parents=True, exist_ok=True)
        (target / f'{uuid}.mobileprovision').write_bytes(content)
    print(f'✓ Lagde og installerte profilen «{name}»')
    return name


def use_manual_signing(bundle_id: str, team: str, profile: str):
    """Setter manuell signering bare på app-målet (Release), så Swift-pakkene ikke får profilen."""
    text = PROJECT.read_text(encoding='utf-8-sig')
    pattern = re.compile(r'(isa = XCBuildConfiguration;\s*buildSettings = \{)(.*?)(\};\s*name = Release;)', re.S)
    changed = 0

    def patch(m: re.Match) -> str:
        nonlocal changed
        settings = m.group(2)
        if f'PRODUCT_BUNDLE_IDENTIFIER = {bundle_id};' not in settings:
            return m.group(0)
        settings = re.sub(r'\n\s*(CODE_SIGN_STYLE|CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER) = [^\n]*;', '', settings)
        settings = ('\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";'
                    '\n\t\t\t\tCODE_SIGN_STYLE = Manual;'
                    f'\n\t\t\t\tDEVELOPMENT_TEAM = {team};'
                    f'\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{profile}";' + settings)
        changed += 1
        return m.group(1) + settings + m.group(3)

    text = pattern.sub(patch, text)
    if changed != 1:
        fail(f'Fant ikke Release-oppsettet for {bundle_id} i {PROJECT}')
    PROJECT.write_text(text, encoding='utf-8')
    print('✓ Xcode-prosjektet bruker manuell signering for Release')


def setup():
    bundle_id = os.environ['BUNDLE_ID']
    key, cert, team = create_certificate()
    if os.environ.get('TEAM_ID') and os.environ['TEAM_ID'] != team:
        print('::warning::APPLE_TEAM_ID stemmer ikke med teamet til API-nøkkelen. Bruker teamet fra nøkkelen.')
    print(f'::add-mask::{team}')
    export_env('TEAM_ID', team)
    install_in_keychain(key, cert)
    profile = create_profile(bundle_id, os.environ['CERT_ID'])
    export_env('PROFILE_NAME', profile)
    use_manual_signing(bundle_id, team, profile)


def cleanup():
    if os.environ.get('PROFILE_ID'):
        status, resp = call('DELETE', f"/profiles/{os.environ['PROFILE_ID']}")
        print('✓ Slettet profilen' if status == 204 else f'::warning::Klarte ikke å slette profilen ({status}): {details(resp)}')
    if os.environ.get('CERT_ID'):
        status, resp = call('DELETE', f"/certificates/{os.environ['CERT_ID']}")
        print('✓ Trakk tilbake sertifikatet' if status == 204 else
              f'::warning::Klarte ikke å trekke tilbake sertifikatet ({status}): {details(resp)}. Gjør det under developer.apple.com/account/resources/certificates.')
    if keychain.exists():
        subprocess.run(['security', 'delete-keychain', str(keychain)])


if __name__ == '__main__':
    {'setup': setup, 'cleanup': cleanup}[sys.argv[1]]()

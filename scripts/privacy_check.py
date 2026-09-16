"""Reject accidental private artifacts before publishing source or CI artifacts.

This supplements human review. It does not prove the absence of all secrets.
"""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
skip = {'.git', 'node_modules', 'build'}
rules = {
    'personal home path': re.compile(r'/' + r'Users/[^/\s]+/'),
    'real Marketplace identifier': re.compile(r'facebook\.com/(?:messages/t|marketplace/item)/\d{7,}'),
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'GitHub token': re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}'),
    'provider secret': re.compile(r'sk-' + r'(?:proj-|ant-)?[A-Za-z0-9_-]{32,}'),
    'AWS access key': re.compile(r'AKIA[A-Z0-9]{16}'),
}
failures = []
checked = 0
for path in root.rglob('*'):
    relative = path.relative_to(root)
    if not path.is_file() or any(part in skip for part in relative.parts):
        continue
    if path.suffix in {'.sqlite', '.db', '.log', '.pem', '.key', '.p12', '.pfx'} or path.name.startswith('.env'):
        failures.append((str(relative), 'private artifact type'))
    if path.suffix == '.png':
        continue
    try:
        text = path.read_text()
    except UnicodeError:
        failures.append((str(relative), 'unexpected binary requires review'))
        continue
    checked += 1
    for name, pattern in rules.items():
        if pattern.search(text):
            failures.append((str(relative), name))
for path, rule in failures:
    print(f'REVIEW: {path}: {rule}')
print(f'Privacy scan: {checked} text files, {len(failures)} findings. Matched values are not printed.')
sys.exit(bool(failures))

"""Deploy a GitHub release to the existing Oracle systemd service."""
from __future__ import annotations

import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.request

TARGET = Path('/opt/kegel-trainer')
STATE = Path('/var/lib/kegel-trainer-deploy')
SERVICE = 'kegel-trainer.service'
HEALTH_URL = 'http://127.0.0.1:3010/health'
APP_USER = 'ubuntu'
PUBLIC_PATTERNS = ('*.html', '*.css', '*.js', 'manifest.webmanifest', 'icons/*.png')
EXCLUDES = [
    '/.git/', '/.github/', '/.spec-workflow/', '/.zcode/', '/.kegel-trainer-root',
    '/public/', '/api/.env', '/api/node_modules/', '/node_modules/',
    '__pycache__/', '*.pyc', '.DS_Store',
]
REQUIRED_FILES = ('index.html', 'style.css', 'script.js', 'api/server.js', 'api/db.js')


def run(*args: str, capture: bool = False, cwd: Path | None = None) -> str:
    result = subprocess.run(args, check=True, text=True, timeout=300, cwd=cwd,
                            stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else ''


def service_state(service: str) -> str:
    return run('systemctl', 'show', service, '--property=ActiveState', '--value', capture=True)


def service_action(action: str, service: str) -> None:
    run('systemctl', action, service)


def sync(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    run('rsync', '-rltp', '--delete', '--delay-updates',
        '--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r',
        *[f'--exclude={pattern}' for pattern in EXCLUDES], f'{source}/', f'{target}/')


def extract_release(archive: Path, target: Path) -> None:
    with tarfile.open(archive) as contents:
        for member in contents.getmembers():
            if (member.name.startswith('/') or '..' in Path(member.name).parts
                    or not (member.isfile() or member.isdir())):
                raise ValueError(f'Unsafe release entry: {member.name}')
        contents.extractall(target, filter='data')
    for name in REQUIRED_FILES:
        if not (target / name).is_file():
            raise ValueError(f'Incomplete release: missing {name}')
    for path in sorted((target / 'api').glob('*.js')):
        run('node', '--check', str(path))


def rebuild_public(target: Path) -> None:
    public = target / 'public'
    public.mkdir(parents=True, exist_ok=True)
    for old in public.iterdir():
        if old.is_file() or old.is_symlink():
            old.unlink()
    for pattern in PUBLIC_PATTERNS:
        for src in target.glob(pattern):
            if src.is_file():
                shutil.copy2(src, public / src.name)
    if not (public / 'index.html').is_file():
        raise ValueError('public/ rebuild failed: index.html missing')


def wait_healthy(service: str, url: str, timeout: int = 60) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                payload = json.load(response)
            if service_state(service) == 'active' and payload.get('status') == 'ok':
                return
        except (OSError, ValueError):
            pass
        time.sleep(2)
    raise RuntimeError(f'Health check failed after {timeout}s')


def save_record(path: Path, value: dict) -> None:
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


def deploy(archive: Path, commit: str, target: Path = TARGET, state: Path = STATE,
           service: str = SERVICE, health_url: str = HEALTH_URL) -> None:
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Expected a full Git commit SHA')
    marker = target / '.kegel-trainer-root'
    if target.resolve() == Path('/') or not marker.is_file() or marker.read_text().strip() != 'kegel-trainer':
        raise ValueError('Invalid deployment directory marker')
    env_file = target / 'api/.env'
    if not env_file.is_file():
        raise ValueError('Production .env is missing')
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = service_state(service)
        if before not in ('active', 'inactive'):
            raise RuntimeError(f'Refusing deployment while service state is {before}')
        was_running = before == 'active'
        record_path = state / 'version.json'
        previous = json.loads(record_path.read_text()) if record_path.exists() else {}
        with tempfile.TemporaryDirectory(prefix='release-', dir=state) as work:
            stage = Path(work) / 'code'
            stage.mkdir()
            extract_release(archive, stage)
            rollback = state / 'rollback-code'
            sync(target, rollback)
            if was_running:
                service_action('stop', service)
            changed = False
            try:
                save_record(state / 'rollback.json', {
                    'previous': previous, 'attempted_commit': commit,
                    'service_running': was_running,
                })
                changed = True
                sync(stage, target)
                rebuild_public(target)
                run('npm', 'install', '--omit=dev', '--no-audit', '--no-fund',
                    cwd=target / 'api')
                run('chown', '-R', f'{APP_USER}:{APP_USER}', str(target))
                if was_running:
                    service_action('start', service)
                    wait_healthy(service, health_url)
                save_record(record_path, {'commit': commit, 'time': time.time(),
                                         'service_running': was_running})
            except Exception:
                if changed:
                    print('Deployment failed; restoring code', flush=True)
                    service_action('stop', service)
                    sync(rollback, target)
                    rebuild_public(target)
                    run('npm', 'install', '--omit=dev', '--no-audit', '--no-fund',
                        cwd=target / 'api')
                    run('chown', '-R', f'{APP_USER}:{APP_USER}', str(target))
                if was_running:
                    service_action('start', service)
                    wait_healthy(service, health_url)
                raise
        print(f'Deployed {commit}; service {"healthy" if was_running else "kept stopped"}', flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('Run via sudo: production directory is root-managed')
    os.umask(0o077)
    deploy(args.archive.resolve(), args.commit)


if __name__ == '__main__':
    main()

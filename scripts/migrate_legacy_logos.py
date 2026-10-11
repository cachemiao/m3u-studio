"""Copy a user's old bundled logo pack into their data directory before upgrading."""
import argparse
import shutil
from pathlib import Path


def migrate(source, target):
    if not source.is_dir():
        raise ValueError('旧版台标目录不存在')
    target.mkdir(parents=True, exist_ok=True)
    copied = 0
    for image in sorted(source.rglob('*.png')):
        destination = target / image.name
        # Keep uploaded replacements. Hidden entries remain hidden in SQLite.
        if not destination.exists():
            shutil.copy2(image, destination)
            copied += 1
    return copied


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='旧版 app/builtin 目录')
    parser.add_argument('target', type=Path, help='持久化 data/logo 目录')
    args = parser.parse_args()
    print(f'已迁移 {migrate(args.source, args.target)} 个台标；同名上传图片保留。')

"""Portable configuration/logo archives; never extract untrusted ZIP paths."""

import io
import json
import stat
import unicodedata
import warnings
import zipfile
from PIL import Image, ImageOps

MAX_ARCHIVE = 64 * 1024 * 1024
MAX_EXPANDED = 128 * 1024 * 1024
MAX_CONFIG = 8 * 1024 * 1024
MAX_LOGOS = 5000
MAX_IMAGE = 8 * 1024 * 1024
FORMAT = {"format": "m3u-studio-backup", "version": 1}


def encode_config(state):
    data = json.dumps(state, ensure_ascii=False, indent=2).encode("utf-8")
    if len(data) > MAX_CONFIG:
        raise ValueError("配置超过 8MB 限制")
    return data


def make_archive(logos, state=None):
    output = io.BytesIO()
    total = 0
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        if state is not None:
            archive.writestr("manifest.json", json.dumps(FORMAT))
            data = encode_config(state)
            total += len(data)
            archive.writestr("config.json", data)
        for count, (name, path) in enumerate(logos, 1):
            if count > MAX_LOGOS or path.is_symlink():
                raise ValueError("台标数量过多或存在不支持的文件")
            data = path.read_bytes()
            total += len(data)
            if len(data) > MAX_IMAGE or total > MAX_EXPANDED:
                raise ValueError("台标库超过备份大小限制")
            archive.writestr("logos/" + name, data)
            if output.tell() > MAX_ARCHIVE:
                raise ValueError("压缩包超过 64MB 限制")
    if output.tell() > MAX_ARCHIVE:
        raise ValueError("压缩包超过 64MB 限制")
    return output.getvalue()


def read_archive(stream, validate, valid_name):
    """Validate the entire archive before returning any files to the caller."""
    with zipfile.ZipFile(stream) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_LOGOS + 2:
            raise ValueError("备份文件数量超过限制")
        names = set()
        total = 0
        for entry in entries:
            name = entry.filename
            key = unicodedata.normalize("NFC", name).casefold()
            mode = entry.external_attr >> 16
            if (
                key in names
                or name != unicodedata.normalize("NFC", name)
                or entry.flag_bits & 1
                or (stat.S_IFMT(mode) not in (0, stat.S_IFREG))
                or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
            ):
                raise ValueError("备份包含重复或不支持的文件")
            names.add(key)
            if name not in ("manifest.json", "config.json") and not (
                name.startswith("logos/") and valid_name(name[6:])
            ):
                raise ValueError("备份包含无效路径或额外文件")
            limit = (
                1024
                if name == "manifest.json"
                else MAX_CONFIG if name == "config.json" else MAX_IMAGE
            )
            total += entry.file_size
            if entry.file_size > limit or total > MAX_EXPANDED:
                raise ValueError("备份解压大小超过限制")
        if not {"manifest.json", "config.json"} <= names:
            raise ValueError("请选择配置与台标备份 ZIP，而非普通台标压缩包")
        manifest = json.loads(archive.read("manifest.json"))
        if manifest != FORMAT or type(manifest.get("version")) is not int:
            raise ValueError("不支持的备份格式或版本")
        state = validate(json.loads(archive.read("config.json")))
        logos = {}
        for entry in entries:
            if not entry.filename.startswith("logos/"):
                continue
            data = archive.read(entry)
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data), formats=("PNG",)) as image:
                    image.load()
                    # Keep application-generated PNGs byte-identical; normalize larger images.
                    if image.width > 300 or image.height > 180 or image.n_frames != 1:
                        normalized = ImageOps.exif_transpose(image).convert("RGBA")
                        normalized.thumbnail((300, 180), Image.Resampling.LANCZOS)
                        output = io.BytesIO()
                        normalized.save(output, "PNG")
                        data = output.getvalue()
            logos[entry.filename[6:]] = data
        return state, logos

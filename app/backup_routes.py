"""Authenticated archive operations, separate from publication and account data."""

import hashlib
import io
import sqlite3
import zlib
import zipfile
from threading import BoundedSemaphore
from flask import jsonify, request, send_file
from PIL import Image, UnidentifiedImageError
from backup_archive import MAX_ARCHIVE, make_archive, read_archive


def register_backup_routes(app, data_dir, db, validate, catalog, valid_name):
    slots = BoundedSemaphore(1)

    def response(data, filename):
        return send_file(
            io.BytesIO(data),
            mimetype="application/zip",
            as_attachment=True,
            download_name=filename,
            max_age=0,
        )

    def logo_files(conn):
        return [(name, data_dir / "logo" / name) for name in catalog(conn)]

    @app.route("/api/backup/archive", methods=["POST"])
    def export_archive():
        if not slots.acquire(blocking=False):
            return jsonify(error="正在处理备份，请稍后重试"), 429
        try:
            state = validate(request.get_json())
            with db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                content = make_archive(logo_files(conn), state)
            return response(content, "m3u-studio-backup.zip")
        except (ValueError, TypeError, AttributeError, RecursionError) as error:
            return jsonify(error=str(error)), 400
        except OSError:
            return jsonify(error="读取台标失败，备份未完成，请重试"), 409
        finally:
            slots.release()

    @app.route("/api/logos/export")
    def export_logos():
        if not slots.acquire(blocking=False):
            return jsonify(error="正在处理备份，请稍后重试"), 429
        try:
            with db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                content = make_archive(logo_files(conn))
            return response(content, "m3u-studio-logos.zip")
        except ValueError as error:
            return jsonify(error=str(error)), 400
        except OSError:
            return jsonify(error="读取台标失败，导出未完成，请重试"), 409
        finally:
            slots.release()

    @app.route("/api/backup/restore", methods=["POST"])
    def restore_archive():
        # Per-request limit: other APIs retain their existing 8MB limit.
        request.max_content_length = MAX_ARCHIVE + 1024 * 1024
        if not slots.acquire(blocking=False):
            return jsonify(error="正在处理备份，请稍后重试"), 429
        created = []
        try:
            upload = request.files.get("file")
            if upload is None:
                raise ValueError("请选择配置与台标备份 ZIP")
            content = upload.stream.read(MAX_ARCHIVE + 1)
            if len(content) > MAX_ARCHIVE:
                return jsonify(error="备份 ZIP 超过 64MB"), 413
            state, logos = read_archive(io.BytesIO(content), validate, valid_name)
            remapped = {}
            with db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                folder = data_dir / "logo"
                occupied = {path.name.casefold() for path in folder.iterdir()}
                hidden = {
                    row[0].casefold()
                    for row in conn.execute("SELECT name FROM hidden_logos")
                }
                for name, image in logos.items():
                    target = name
                    path = folder / target
                    if name.casefold() in occupied or name.casefold() in hidden:
                        if (
                            name.casefold() not in hidden
                            and not path.is_symlink()
                            and path.is_file()
                            and path.read_bytes() == image
                        ):
                            continue
                        suffix = hashlib.sha256(image).hexdigest()[:10]
                        stem = name[:-4][:145]
                        number = 0
                        while True:
                            target = f"{stem}-restored-{suffix}{'-'+str(number) if number else ''}.png"
                            if target.casefold() not in occupied | hidden:
                                break
                            existing = folder / target
                            if (
                                target.casefold() not in hidden
                                and not existing.is_symlink()
                                and existing.is_file()
                                and existing.read_bytes() == image
                            ):
                                break
                            number += 1
                        remapped[name] = target
                    path = folder / target
                    if (
                        target != name
                        and path.is_file()
                        and not path.is_symlink()
                        and path.read_bytes() == image
                    ):
                        continue
                    # Exclusive creation: never overwrite a published or concurrent logo.
                    with path.open("xb") as output:
                        created.append(path)
                        output.write(image)
                    occupied.add(target.casefold())
                for item in state["lists"]:
                    for channel in item["channels"]:
                        name = channel["logo"].removeprefix("/logo/")
                        if channel["logo"].startswith("/logo/") and name in remapped:
                            channel["logo"] = "/logo/" + remapped[name]
                missing = sum(
                    channel["logo"].startswith("/logo/")
                    and not (folder / channel["logo"][6:]).is_file()
                    for item in state["lists"]
                    for channel in item["channels"]
                )
            return jsonify(
                state=state,
                imported=len(created),
                renamed=len(remapped),
                missing=missing,
            )
        except (
            ValueError,
            TypeError,
            AttributeError,
            KeyError,
            RecursionError,
            zipfile.BadZipFile,
            NotImplementedError,
            UnidentifiedImageError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
            zlib.error,
        ):
            for path in created:
                path.unlink(missing_ok=True)
            return jsonify(error="备份格式、配置或图片无效，未恢复任何内容"), 400
        except (OSError, RuntimeError, sqlite3.Error):
            for path in created:
                path.unlink(missing_ok=True)
            return jsonify(error="恢复未完成，新增台标已撤回，请重试"), 409
        finally:
            slots.release()

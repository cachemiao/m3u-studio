import io
import json
import stat
import zipfile
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))

import pytest
from PIL import Image
import backup_archive
from test_app import server, auth, client, sample


def png(color="red"):
    output = io.BytesIO()
    Image.new("RGBA", (32, 20), color).save(output, "PNG")
    return output.getvalue()


def archive(state=None, images=None, extras=(), version=1):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "manifest.json",
            json.dumps({"format": "m3u-studio-backup", "version": version}),
        )
        z.writestr("config.json", json.dumps(state if state is not None else sample()))
        for name, image in (images or {}).items():
            z.writestr("logos/" + name, image)
        for name, content in extras:
            z.writestr(name, content)
    return output.getvalue()


def restore(c, auth, content):
    return c.post(
        "/api/backup/restore",
        headers=auth,
        data={"file": (io.BytesIO(content), "backup.zip")},
    )


def test_export_captures_draft_and_entire_library_without_account_data(server, auth):
    c = client(server, auth)
    for name in ("CCTV1.png", "Unused.png"):
        (server.DATA / "logo" / name).write_bytes(png())
    before = c.get("/api/state").json
    draft = sample()
    draft["lists"][0]["name"] = "Unpublished draft"
    response = c.post("/api/backup/archive", headers=auth, json=draft)
    assert response.status_code == 200
    assert "m3u-studio-backup.zip" in response.headers["Content-Disposition"]
    with zipfile.ZipFile(io.BytesIO(response.data)) as z:
        assert set(z.namelist()) == {
            "manifest.json",
            "config.json",
            "logos/CCTV1.png",
            "logos/Unused.png",
        }
        saved = json.loads(z.read("config.json"))
        assert saved["lists"][0]["name"] == "Unpublished draft"
        assert set(saved) == {"lists", "epg"}
        assert z.read("logos/Unused.png") == png()
    assert c.get("/api/state").json == before


def test_restore_adds_logos_but_does_not_publish_or_replace_account(server, auth):
    c = client(server, auth)
    before = c.get("/api/state").json
    account = server.account()
    response = restore(
        c, auth, archive(images={"CCTV1.png": png(), "Unused.png": png()})
    )
    assert response.status_code == 200
    assert response.json["imported"] == 2
    assert response.json["missing"] == 0
    assert c.get("/api/state").json == before
    assert server.account() == account
    assert c.get("/logo/CCTV1.png").data == png()
    # Restoring the same archive reuses identical files.
    assert (
        restore(
            c, auth, archive(images={"CCTV1.png": png(), "Unused.png": png()})
        ).json["imported"]
        == 0
    )


def test_conflicts_are_renamed_and_only_restored_references_change(server, auth):
    c = client(server, auth)
    (server.DATA / "logo/CCTV1.png").write_bytes(png("blue"))
    c.put("/api/state", headers=auth, json=sample())
    before = c.get("/api/state").json
    result = restore(c, auth, archive(images={"CCTV1.png": png()})).json
    new_path = result["state"]["lists"][0]["channels"][0]["logo"]
    assert new_path != "/logo/CCTV1.png"
    assert result["renamed"] == 1
    again = restore(c, auth, archive(images={"CCTV1.png": png()})).json
    assert again["imported"] == 0
    assert again["state"]["lists"][0]["channels"][0]["logo"] == new_path
    assert c.get(new_path).data == png()
    assert c.get("/logo/CCTV1.png").data == png("blue")
    assert c.get("/api/state").json == before


def test_all_logos_export_ignores_search_and_excludes_hidden_files(server, auth):
    c = client(server, auth)
    for name in ["Used.png", "Unused.png", "Hidden.png"]:
        (server.DATA / "logo" / name).write_bytes(png())
    with server.db() as conn:
        conn.execute("INSERT INTO hidden_logos VALUES (?)", ("Hidden.png",))
    response = c.get("/api/logos/export?search=Used")
    assert response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(response.data)) as z:
        assert set(z.namelist()) == {"logos/Used.png", "logos/Unused.png"}


@pytest.mark.parametrize(
    "path",
    [
        "../escape.png",
        "/absolute.png",
        "logos/../escape.png",
        "logos/sub/a.png",
        "account.json",
    ],
)
def test_unknown_or_traversal_paths_never_write(server, auth, path):
    c = client(server, auth)
    response = restore(
        c, auth, archive(images={"Valid.png": png()}, extras=[(path, png())])
    )
    assert response.status_code == 400
    assert list((server.DATA / "logo").iterdir()) == []


@pytest.mark.parametrize(
    "images",
    [
        {"Valid.png": png(), "Broken.png": b"not an image"},
        {"A.png": png(), "a.png": png()},
    ],
)
def test_invalid_image_or_duplicate_case_rejects_entire_restore(server, auth, images):
    c = client(server, auth)
    assert restore(c, auth, archive(images=images)).status_code == 400
    assert list((server.DATA / "logo").iterdir()) == []


def test_symlink_entry_and_future_format_are_rejected(server, auth):
    c = client(server, auth)
    link = zipfile.ZipInfo("logos/Link.png")
    link.create_system = 3
    link.external_attr = (stat.S_IFLNK | 0o777) << 16
    assert (
        restore(c, auth, archive(extras=[(link, b"../../private")])).status_code == 400
    )
    assert restore(c, auth, archive(version=2)).status_code == 400


def test_expanded_size_limit_checked_before_image_read(server, auth, monkeypatch):
    c = client(server, auth)
    content = archive(images={"A.png": png()})
    monkeypatch.setattr(backup_archive, "MAX_EXPANDED", 10)
    assert restore(c, auth, content).status_code == 400
    assert list((server.DATA / "logo").iterdir()) == []


def test_invalid_configuration_is_rejected_before_any_logo_writes(server, auth):
    c = client(server, auth)
    assert (
        restore(
            c, auth, archive(state={"lists": None}, images={"A.png": png()})
        ).status_code
        == 400
    )
    assert list((server.DATA / "logo").iterdir()) == []


def test_write_failure_rolls_back_only_new_logos(server, auth, monkeypatch):
    c = client(server, auth)
    (server.DATA / "logo/Existing.png").write_bytes(png("blue"))
    original = type(server.DATA).open

    def failing_open(path, mode="r", *args, **kwargs):
        if path.name == "B.png" and mode == "xb":
            raise OSError("simulated disk failure")
        return original(path, mode, *args, **kwargs)

    monkeypatch.setattr(type(server.DATA), "open", failing_open)
    assert (
        restore(c, auth, archive(images={"A.png": png(), "B.png": png()})).status_code
        == 409
    )
    assert {p.name for p in (server.DATA / "logo").iterdir()} == {"Existing.png"}
    assert c.get("/logo/Existing.png").data == png("blue")


def test_backup_routes_require_auth_and_csrf(server, auth):
    c = server.app.test_client()
    assert c.get("/api/logos/export").status_code == 401
    assert c.post("/api/backup/archive", json=sample(), headers=auth).status_code == 401
    c = client(server, auth)
    assert c.post("/api/backup/archive", json=sample()).status_code == 403
    assert c.post("/api/backup/restore", data={}).status_code == 403


def test_missing_local_reference_is_reported_not_silently_deleted(server, auth):
    result = restore(client(server, auth), auth, archive()).json
    assert result["missing"] == 2
    assert result["state"]["lists"][0]["channels"][0]["logo"] == "/logo/CCTV1.png"

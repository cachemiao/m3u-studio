"""Transactional schema baseline; never guess how to open a future database."""

import json
import secrets
import sqlite3

SCHEMA_VERSION = 1
TABLES = {
    "state": ("id", "revision", "payload"),
    "history": ("revision", "created_at", "payload"),
    "account": ("id", "username", "password_hash", "version"),
    "security": ("key", "value"),
}


def ensure_schema(path):
    connection = sqlite3.connect(path, timeout=20)
    try:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if not 0 <= version <= SCHEMA_VERSION:
            raise RuntimeError(
                f"Database schema {version} is not supported by this build (maximum {SCHEMA_VERSION}); restore a compatible backup instead of downgrading in place."
            )
        connection.execute("BEGIN IMMEDIATE")
        # Recheck while holding the write lock, including concurrent worker startup.
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if not 0 <= version <= SCHEMA_VERSION:
            raise RuntimeError("Unsupported database schema")
        if version == 0:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL, version TEXT NOT NULL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS security (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT OR IGNORE INTO state VALUES (1,0,?)",
                (json.dumps({"lists": [], "epg": ""}),),
            )
            connection.execute(
                "INSERT OR IGNORE INTO security VALUES (?,?)",
                ("session_key", secrets.token_hex(32)),
            )
        for name, required in TABLES.items():
            actual = {
                row[1] for row in connection.execute("PRAGMA table_info(" + name + ")")
            }
            if not set(required) <= actual:
                raise RuntimeError("Incompatible database table: " + name)
        if version == 0:
            connection.execute("PRAGMA user_version=1")
        connection.commit()
        connection.execute("PRAGMA journal_mode=WAL")
        return SCHEMA_VERSION
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()

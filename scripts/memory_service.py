"""
memory_service.py — PostgreSQL-backed memory via Supabase
==========================================================
Provides:
  - MemoryService: initialises PostgresSaver (LangGraph checkpoint),
    falling back to MemorySaver if Postgres is unavailable.
  - get_connection_pool(): singleton psycopg ConnectionPool.
"""

import os
import logging
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

# ─── Connection URL ───────────────────────────────────────────────────────────
POSTGRES_URL = os.getenv("SUPABASE_DB_URL", "")

# ─── Optional imports with graceful degradation ──────────────────────────────
try:
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool
    PSYCOPG_AVAILABLE = True
except ImportError:
    PSYCOPG_AVAILABLE = False
    print("[WARN] psycopg / psycopg_pool not installed.")

try:
    from langgraph.checkpoint.postgres import PostgresSaver
    POSTGRES_SAVER_AVAILABLE = True
except ImportError:
    POSTGRES_SAVER_AVAILABLE = False
    print("[WARN] langgraph-checkpoint-postgres not installed.")

try:
    from langgraph.checkpoint.memory import MemorySaver
    MEMORY_SAVER_AVAILABLE = True
except ImportError:
    MEMORY_SAVER_AVAILABLE = False

# ─── Singleton pool ───────────────────────────────────────────────────────────
_connection_pool: Optional["ConnectionPool"] = None


def get_connection_pool() -> Optional["ConnectionPool"]:
    """Return (or lazily create) the shared psycopg ConnectionPool."""
    global _connection_pool
    if _connection_pool is not None:
        return _connection_pool

    if not (PSYCOPG_AVAILABLE and POSTGRES_URL):
        return None

    try:
        logger.info("Creating PostgreSQL connection pool…")

        # ✅ FIX: Pool-level params (max_lifetime, max_idle, etc.) go here as
        #         direct kwargs — NOT inside the DSN string or `kwargs` dict.
        #         The `kwargs` dict is only for psycopg connection options.
        _connection_pool = ConnectionPool(
            conninfo=POSTGRES_URL,
            min_size=1,
            max_size=10,
            open=True,                      # open pool immediately
            kwargs={
                "autocommit": True,
                "row_factory": dict_row,
                "sslmode": "require",       # required for Supabase
            },
            # Pool-level params belong here (not in conninfo/DSN):
            max_waiting=10,
            reconnect_timeout=5.0,
        )
        logger.info("PostgreSQL connection pool created.")
        return _connection_pool

    except Exception as exc:
        logger.error(f"Failed to create connection pool: {exc}")
        return None


# ─── MemoryService ────────────────────────────────────────────────────────────

class MemoryService:
    """
    Initialises the LangGraph checkpoint saver.

    Priority:
      1. PostgresSaver  (Supabase Postgres)
      2. MemorySaver    (in-process fallback; state lost on restart)
    """

    def __init__(self):
        self.checkpointer = None
        self._init_checkpointer()

    def _init_checkpointer(self):
        pool = get_connection_pool()
        if pool and POSTGRES_SAVER_AVAILABLE:
            try:
                self.checkpointer = PostgresSaver(pool)
                self.checkpointer.setup()   # creates tables if missing
                print("[OK] LangGraph checkpointer: PostgreSQL (Supabase)")
                return
            except Exception as exc:
                print(f"[WARN] PostgresSaver setup failed: {exc}")

        # Fallback
        if MEMORY_SAVER_AVAILABLE:
            from langgraph.checkpoint.memory import MemorySaver
            self.checkpointer = MemorySaver()
            print("[WARN] LangGraph checkpointer: in-memory (fallback)")
        else:
            print("[ERROR] No checkpointer available — graph will have no memory.")

    def get_checkpointer(self):
        return self.checkpointer


# Module-level singleton
memory_service = MemoryService()
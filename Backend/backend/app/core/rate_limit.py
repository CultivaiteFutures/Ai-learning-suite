"""
Shared rate limiter (slowapi, backed by the `limits` library) -- a single
Limiter instance imported by app.main (to install the middleware/exception
handler) and by any route module that needs a tighter limit than the global
default, e.g. login's brute-force guard in app/api/v1/auth.py.

Keyed by client IP (get_remote_address). This app runs as a single instance
today (see app/main.py's uploads-dir comment for the same caveat) so an
in-memory limiter is fine; if this ever runs multi-instance, swap in a
Redis-backed storage_uri here -- nothing else needs to change.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])

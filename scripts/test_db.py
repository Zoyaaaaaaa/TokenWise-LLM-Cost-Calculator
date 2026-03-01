"""Quick test: verify the Supabase DB URL resolves and connects."""
import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_DB_URL", "")
print(f"DB URL: {url[:60]}...")

try:
    import psycopg
    conn = psycopg.connect(url, connect_timeout=10)
    print("Connection SUCCESS!")
    conn.close()
except Exception as e:
    print(f"Connection FAILED: {e}")

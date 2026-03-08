"""
Test PostgreSQL Connection to Supabase
========================================
Run this script to verify your Supabase database connection before starting the backend.
"""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "")

print("=" * 60)
print("PostgreSQL Connection Test")
print("=" * 60)
print(f"\nUsing connection string: {SUPABASE_DB_URL[:50]}...")
print()

try:
    import psycopg2
    print("[OK] psycopg2 imported successfully")
    
    # Add SSL mode if not present
    db_url = SUPABASE_DB_URL
    if "?" not in db_url:
        db_url += "?sslmode=require&connect_timeout=10"
    
    print(f"[INFO] Connecting to Supabase...")
    
    # Try to connect
    conn = psycopg2.connect(db_url)
    print("[OK] Connection successful!")
    
    # Get server version
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"[OK] PostgreSQL Version: {version}")
    
    # List existing tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    print(f"\n[INFO] Found {len(tables)} tables in public schema:")
    for table in tables:
        print(f"  - {table[0]}")
    
    cursor.close()
    conn.close()
    print("\n[OK] Connection test completed successfully!")
    print("=" * 60)
    
except ImportError as e:
    print(f"[ERROR] psycopg2 not installed: {e}")
    print("\n[SOLUTION] Run: pip install psycopg2-binary")
    print("=" * 60)
    
except Exception as e:
    print(f"[ERROR] Connection failed: {e}")
    print("\n[TROUBLESHOOTING]")
    print("1. Check if your Supabase project is active (not paused)")
    print("2. Verify your database password in .env")
    print("3. Ensure SSL mode is enabled: sslmode=require")
    print("4. Check firewall/network settings")
    print("5. Visit: https://supabase.com/dashboard/project/ifddrerepehclejjwnoo")
    print("=" * 60)

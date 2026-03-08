"""
Verify Supabase Connection Credentials
======================================
This script tests your database connection and shows what's wrong.
"""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "")

print("=" * 70)
print("Supabase Connection Verification")
print("=" * 70)
print(f"\nConnection String:\n{SUPABASE_DB_URL}\n")

# Parse the connection string
try:
    # Extract components
    if "://" in SUPABASE_DB_URL:
        auth_part = SUPABASE_DB_URL.split("://")[1].split("@")[0]
        host_part = SUPABASE_DB_URL.split("@")[1].split("/")[0]
        
        username = auth_part.split(":")[0]
        password_encoded = auth_part.split(":")[1]
        
        print("Parsed Components:")
        print(f"  Username: {username}")
        print(f"  Password (encoded): {password_encoded}")
        print(f"  Host: {host_part}")
        
        # Decode password
        from urllib.parse import unquote
        password_decoded = unquote(password_encoded)
        print(f"  Password (decoded): {password_decoded}")
        
except Exception as e:
    print(f"Error parsing: {e}")

print("\n" + "=" * 70)
print("Testing Connection...")
print("=" * 70)

try:
    import psycopg2
    
    # Add a longer timeout since circuit breaker might be active
    conn = psycopg2.connect(SUPABASE_DB_URL, connect_timeout=30)
    
    print("\n✅ CONNECTION SUCCESSFUL!")
    
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"\nPostgreSQL Version: {version[:80]}...")
    
    # List tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    print(f"\nFound {len(tables)} tables:")
    for table in tables:
        print(f"  - {table[0]}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 70)
    print("🎉 All checks passed! Your configuration is correct.")
    print("=" * 70)
    
except psycopg2.OperationalError as e:
    error_msg = str(e)
    print(f"\n❌ CONNECTION FAILED!")
    print(f"\nError: {error_msg}")
    
    if "Circuit breaker open" in error_msg or "Too many authentication errors" in error_msg:
        print("\n⚠️  CIRCUIT BREAKER ACTIVE")
        print("\nProblem: Supabase has temporarily blocked connections due to too many")
        print("         failed authentication attempts.")
        print("\nSolutions:")
        print("  1. WAIT 5-10 minutes for the circuit breaker to reset")
        print("  2. Verify your password is correct in Supabase Dashboard")
        print("  3. Get fresh credentials from:")
        print("     https://supabase.com/dashboard/project/ifddrerepehclejjwnoo/database/settings")
        print("\nAfter waiting, try again with the correct password.")
        
    elif "password authentication failed" in error_msg:
        print("\n⚠️  WRONG PASSWORD")
        print("\nProblem: The password in your .env file doesn't match Supabase.")
        print("\nSolution:")
        print("  1. Go to: https://supabase.com/dashboard/project/ifddrerepehclejjwnoo/database/settings")
        print("  2. Click 'Reveal password' under Connection string")
        print("  3. Copy the EXACT password")
        print("  4. Update .env file:")
        print("     - Replace Zoya0302Zoy with your actual password")
        print("     - URL-encode special characters (@ → %40, # → %23, etc.)")
        
    elif "timeout" in error_msg.lower():
        print("\n⚠️  CONNECTION TIMEOUT")
        print("\nProblem: Cannot reach Supabase server.")
        print("\nSolutions:")
        print("  1. Check your internet connection")
        print("  2. Verify Supabase project is not paused")
        print("  3. Try increasing timeout in connection string")
        
    elif "does not exist" in error_msg or "not found" in error_msg:
        print("\n⚠️  USER/DATABASE NOT FOUND")
        print("\nProblem: The username or database doesn't exist.")
        print("\nSolution:")
        print("  1. Verify you're using the correct connection string from:")
        print("     https://supabase.com/dashboard/project/ifddrerepehclejjwnoo/database/settings")
        print("  2. Make sure to use Session pooler (NOT Direct connection)")
        
except ImportError:
    print("\n❌ psycopg2 NOT INSTALLED")
    print("\nSolution: Run this command:")
    print("  pip install psycopg2-binary")
    
except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")

print("\n" + "=" * 70)

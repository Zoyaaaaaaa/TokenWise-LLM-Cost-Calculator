import os
from dotenv import load_dotenv
load_dotenv()

try:
    from langfuse import get_client
    print("Import successful")
    client = get_client(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
        host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
    )
    print("Client initialized")
    if client.auth_check():
        print("Auth check passed")
    else:
        print("Auth check failed")
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()

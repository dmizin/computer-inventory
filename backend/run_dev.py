#!/usr/bin/env python3
"""Development server runner for Computer Inventory System"""
import uvicorn
from app.config import get_settings

def main():
    settings = get_settings()

    print(f"Starting {settings.app_name} v{settings.app_version}")
    print(f"Debug mode: {settings.debug}")
    print("-" * 60)

    api_keys = settings.get_api_key_hashes()
    if api_keys:
        print(f"API Keys configured: {len(api_keys)} key(s)")
    else:
        print("No API keys configured - authentication disabled")
        print("Generate keys with: python -m app.config")

    print("-" * 60)
    print(f"Server starting at: http://{settings.host}:{settings.port}")
    print(f"API Documentation: http://{settings.host}:{settings.port}/docs")
    print(f"Health Check: http://{settings.host}:{settings.port}/api/v1/health")
    print("-" * 60)

    try:
        uvicorn.run(
            "app.main:app",
            host=settings.host,
            port=settings.port,
            reload=True,
            log_level=settings.log_level.lower(),
            access_log=True
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"\nServer failed to start: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())

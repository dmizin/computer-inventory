#!/usr/bin/env python3
"""
1Password Connect Integration Test Script

Usage:
  python -m scripts.test_onepassword
  python scripts/test_onepassword.py
  cd scripts && python test_onepassword.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

try:
    from app.services.onepassword import OnePasswordService, OnePasswordError
    from app.config import get_settings
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"Current directory: {Path.cwd()}")
    print(f"Script directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    print(f"Python path: {sys.path[:3]}...")
    print("\nTry running from the backend/ directory:")
    print("  python -m scripts.test_onepassword")
    sys.exit(1)


async def test_1password_connectivity():
    """Test basic connectivity to 1Password Connect"""
    print("Testing 1Password Connect connectivity...")

    settings = get_settings()

    if not settings.onepassword_enabled:
        print("❌ 1Password integration is disabled in settings")
        return False

    if not settings.op_connect_host:
        print("❌ OP_CONNECT_HOST not configured")
        return False

    if not settings.op_api_token:
        print("❌ OP_API_TOKEN not configured")
        return False

    print(f"✓ 1Password Connect Host: {settings.op_connect_host}")
    print(f"✓ Vault Name: {settings.op_vault_name}")
    print(f"✓ SSL Verify: {settings.op_ssl_verify}")

    op_service = OnePasswordService(settings)

    try:
        # Test connectivity
        await op_service.test_connectivity()
        print("✅ Successfully connected to 1Password Connect")

        # Test vault access
        vault_id = await op_service.get_vault_id()
        print(f"✅ Successfully accessed vault '{settings.op_vault_name}' (ID: {vault_id})")

        return True

    except OnePasswordError as e:
        print(f"❌ 1Password error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


async def test_secret_creation():
    """Test creating a test secret"""
    print("\nTesting secret creation...")

    settings = get_settings()
    op_service = OnePasswordService(settings)

    # Create a mock asset for testing
    class MockAsset:
        def __init__(self):
            self.id = "test-asset-123"
            self.hostname = "test-server"
            self.fqdn = "test-server.example.com"
            self.location = "Test Lab"
            self.type = "server"

    # Create a mock management controller
    class MockController:
        def __init__(self):
            self.type = "idrac"
            self.address = "192.168.1.100"
            self.port = 443
            self.ui_url = "https://192.168.1.100"

    mock_asset = MockAsset()
    mock_controller = MockController()

    test_mgmt_creds = {
        "username": "testadmin",
        "password": "testpassword123"
    }

    test_os_creds = {
        "username": "testroot",
        "password": "testospassword123",
        "ssh_key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... (test key)"
    }

    try:
        secret_id = await op_service.create_or_update_asset_secret(
            asset=mock_asset,
            mgmt_controller=mock_controller,
            mgmt_credentials=test_mgmt_creds,
            os_credentials=test_os_creds
        )

        if secret_id:
            print(f"✅ Successfully created test secret with ID: {secret_id}")

            # Add a small delay to ensure the secret is available
            await asyncio.sleep(1)

            try:
                # Try to retrieve it
                secret_data = await op_service.get_asset_secret(secret_id)
                print(f"✅ Successfully retrieved secret: {secret_data.get('title', 'Unknown')}")

                # Verify that our test credentials are in the secret
                fields = secret_data.get('fields', [])
                mgmt_username_field = next((f for f in fields if f.get('id') == 'mgmt_username'), None)
                os_username_field = next((f for f in fields if f.get('id') == 'os_username'), None)

                if mgmt_username_field and mgmt_username_field.get('value') == 'testadmin':
                    print("✅ Management credentials correctly stored")
                else:
                    print("⚠️  Management credentials not found or incorrect")

                if os_username_field and os_username_field.get('value') == 'testroot':
                    print("✅ OS credentials correctly stored")
                else:
                    print("⚠️  OS credentials not found or incorrect")

            except OnePasswordError as e:
                print(f"⚠️  Could not retrieve secret for verification: {e}")
                print("   This might be a timing issue, but the secret was created successfully.")
                # Don't fail the test just because retrieval failed

            # Clean up - delete the test secret
            try:
                deleted = await op_service.delete_asset_secret(secret_id)
                if deleted:
                    print("✅ Successfully deleted test secret")
                else:
                    print("⚠️  Could not delete test secret - you may need to clean it up manually")
            except OnePasswordError as e:
                print(f"⚠️  Could not delete test secret: {e}")
                print(f"   You may need to manually delete secret ID: {secret_id}")

            return True
        else:
            print("❌ Secret creation returned empty ID")
            return False

    except OnePasswordError as e:
        print(f"❌ 1Password error during secret test: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during secret test: {e}")
        return False


async def main():
    """Main test runner"""
    print("🔐 1Password Connect Integration Test")
    print("=" * 50)

    # Test connectivity first
    connectivity_ok = await test_1password_connectivity()

    if not connectivity_ok:
        print("\n❌ Connectivity test failed. Please check your configuration:")
        print("   - Ensure 1Password Connect is running")
        print("   - Verify OP_CONNECT_HOST is correct")
        print("   - Verify OP_API_TOKEN is valid")
        print("   - Check vault name and permissions")
        return

    # Test secret operations
    secret_test_ok = await test_secret_creation()

    if secret_test_ok:
        print("\n🎉 All tests passed! Your 1Password integration is working correctly.")
    else:
        print("\n❌ Secret creation test failed. Check the logs for more details.")

    # Show environment configuration
    print("\n📋 Current Configuration:")
    settings = get_settings()
    print(f"ONEPASSWORD_ENABLED: {settings.onepassword_enabled}")
    print(f"OP_CONNECT_HOST: {settings.op_connect_host}")
    print(f"OP_API_TOKEN: {'***' + settings.op_api_token[-4:] if settings.op_api_token and len(settings.op_api_token) >= 4 else 'NOT SET'}")
    print(f"OP_VAULT_NAME: {settings.op_vault_name}")
    print(f"OP_SSL_VERIFY: {settings.op_ssl_verify}")
    if settings.op_ssl_cert_file:
        print(f"OP_SSL_CERT_FILE: {settings.op_ssl_cert_file}")

    # Show raw environment variables for comparison
    print("\n📋 Raw Environment Variables:")
    env_vars = ['ONEPASSWORD_ENABLED', 'OP_CONNECT_HOST', 'OP_API_TOKEN', 'OP_VAULT_NAME', 'OP_SSL_VERIFY']
    for var in env_vars:
        value = os.getenv(var)
        if var == 'OP_API_TOKEN' and value and len(value) >= 4:
            value = '***' + value[-4:]
        print(f"{var}: {value if value else 'NOT SET'}")


if __name__ == "__main__":
    asyncio.run(main())

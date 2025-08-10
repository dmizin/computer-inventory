#!/usr/bin/env python3
"""
1Password Connect Debug Script

Debug and troubleshoot 1Password Connect integration issues.

Usage:
  python -m scripts.debug_1password
  python scripts/debug_1password.py
"""
import asyncio
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

try:
    from app.services.onepassword import OnePasswordService, OnePasswordError
    from app.config import get_settings
    from app.database import SessionLocal
    from app.models import Asset
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"Current directory: {Path.cwd()}")
    print(f"Script directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    print("\nTry running from the backend/ directory:")
    print("  python -m scripts.debug_1password")
    sys.exit(1)


async def debug_vault_contents():
    """List all secrets in the vault to debug the issue"""
    print("🔍 Debugging 1Password Vault Contents")
    print("=" * 50)

    settings = get_settings()
    op_service = OnePasswordService(settings)

    try:
        vault_id = await op_service.get_vault_id()
        print(f"Vault ID: {vault_id}")

        # Use the internal HTTP client to list items
        async with op_service._create_http_client() as client:
            response = await client.get(
                f"{settings.op_connect_host}/v1/vaults/{vault_id}/items",
                headers=op_service._get_headers()
            )

            if response.status_code == 200:
                items = response.json()
                print(f"\nFound {len(items)} items in vault:")

                # Look for our test secrets
                test_secrets = [item for item in items if 'asset-test-asset-123' in item.get('title', '')]
                if test_secrets:
                    print(f"\nFound {len(test_secrets)} test secrets:")
                    for secret in test_secrets:
                        print(f"  - ID: {secret['id']}")
                        print(f"    Title: {secret['title']}")
                        print(f"    Created: {secret.get('createdAt', 'Unknown')}")
                        print(f"    Updated: {secret.get('updatedAt', 'Unknown')}")
                        print()

                # Look for asset secrets
                asset_secrets = [item for item in items if item.get('title', '').startswith('asset-')]
                if asset_secrets:
                    print(f"\nFound {len(asset_secrets)} asset secrets:")
                    for secret in asset_secrets[:10]:  # Show first 10
                        print(f"  - {secret['title']} (ID: {secret['id']})")
                    if len(asset_secrets) > 10:
                        print(f"  ... and {len(asset_secrets) - 10} more")

                # List recent items
                print("\nRecent items (last 5):")
                sorted_items = sorted(items, key=lambda x: x.get('createdAt', ''), reverse=True)[:5]
                for item in sorted_items:
                    print(f"  - {item['title']} (ID: {item['id']})")

                return items
            else:
                print(f"Failed to list items: {response.status_code}")
                print(f"Response: {response.text}")
                return []

    except Exception as e:
        print(f"Error: {e}")
        return []


async def test_specific_secret_retrieval(secret_id: str):
    """Test retrieving a specific secret"""
    print(f"\n🔍 Testing Retrieval of Secret: {secret_id}")
    print("=" * 50)

    settings = get_settings()
    op_service = OnePasswordService(settings)

    try:
        vault_id = await op_service.get_vault_id()

        # Try multiple approaches
        async with op_service._create_http_client() as client:
            # Direct API call
            url = f"{settings.op_connect_host}/v1/vaults/{vault_id}/items/{secret_id}"
            print(f"Trying URL: {url}")

            response = await client.get(url, headers=op_service._get_headers())
            print(f"Response status: {response.status_code}")

            if response.status_code == 200:
                secret = response.json()
                print("✅ Successfully retrieved secret!")
                print(f"Title: {secret.get('title')}")
                print(f"Category: {secret.get('category')}")
                print(f"Fields: {len(secret.get('fields', []))}")

                # Show field details
                fields = secret.get('fields', [])
                print("\nFields:")
                for field in fields:
                    field_type = field.get('type', 'UNKNOWN')
                    field_value = field.get('value', '')
                    if field_type in ['CONCEALED', 'PASSWORD'] and field_value:
                        field_value = '***' + field_value[-3:] if len(field_value) > 3 else '***'
                    print(f"  {field.get('label', field.get('id', 'UNKNOWN'))}: {field_value} ({field_type})")

                return secret
            else:
                print(f"❌ Failed: {response.text}")
                return None

    except Exception as e:
        print(f"Error: {e}")
        return None


async def compare_database_with_vault():
    """Compare database records with vault contents"""
    print("\n🔍 Comparing Database with Vault Contents")
    print("=" * 50)

    # Get assets from database
    db = SessionLocal()
    try:
        assets_with_secrets = db.query(Asset).filter(
            Asset.onepassword_secret_id.isnot(None)
        ).all()

        print(f"Found {len(assets_with_secrets)} assets with 1Password secrets in database")

        if not assets_with_secrets:
            print("No assets with secrets found in database")
            return

        # Check each asset's secret in 1Password
        settings = get_settings()
        op_service = OnePasswordService(settings)

        vault_items = await debug_vault_contents()
        vault_ids = {item['id'] for item in vault_items}

        print("\n🔍 Checking Database vs Vault Consistency:")

        found_count = 0
        missing_count = 0

        for asset in assets_with_secrets:
            secret_id = asset.onepassword_secret_id
            if secret_id in vault_ids:
                print(f"  ✅ {asset.hostname}: Secret found in vault")
                found_count += 1
            else:
                print(f"  ❌ {asset.hostname}: Secret NOT found in vault (ID: {secret_id})")
                missing_count += 1

        print(f"\n📊 Summary:")
        print(f"  ✅ Secrets found: {found_count}")
        print(f"  ❌ Secrets missing: {missing_count}")

        if missing_count > 0:
            print(f"\n⚠️  {missing_count} assets have secret IDs in database but secrets don't exist in vault")
            print("This could indicate:")
            print("  - Secrets were deleted from 1Password")
            print("  - Database has stale references")
            print("  - Connection to wrong vault")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


async def test_secret_operations():
    """Test create, read, update, delete operations"""
    print("\n🔍 Testing CRUD Operations")
    print("=" * 50)

    settings = get_settings()
    op_service = OnePasswordService(settings)

    # Create a test asset
    class MockAsset:
        def __init__(self):
            self.id = "debug-test-asset"
            self.hostname = "debug-server"
            self.fqdn = "debug-server.test.com"
            self.location = "Debug Lab"
            self.type = "server"

    mock_asset = MockAsset()
    test_creds = {
        "username": "debuguser",
        "password": "debugpass123"
    }

    try:
        # Test Create
        print("Testing CREATE operation...")
        secret_id = await op_service.create_or_update_asset_secret(
            asset=mock_asset,
            mgmt_controller=None,
            mgmt_credentials=test_creds,
            os_credentials=test_creds
        )

        if secret_id:
            print(f"✅ CREATE successful: {secret_id}")

            # Test Read
            print("Testing READ operation...")
            try:
                secret = await op_service.get_asset_secret(secret_id)
                print("✅ READ successful")

                # Test Update
                print("Testing UPDATE operation...")
                updated_creds = {
                    "username": "updateduser",
                    "password": "updatedpass456"
                }

                updated_secret_id = await op_service.create_or_update_asset_secret(
                    asset=mock_asset,
                    mgmt_controller=None,
                    mgmt_credentials=updated_creds,
                    os_credentials=updated_creds
                )

                if updated_secret_id == secret_id:
                    print("✅ UPDATE successful")
                else:
                    print(f"⚠️  UPDATE returned different ID: {updated_secret_id}")

            except Exception as e:
                print(f"❌ READ failed: {e}")

            # Test Delete
            print("Testing DELETE operation...")
            try:
                deleted = await op_service.delete_asset_secret(secret_id)
                if deleted:
                    print("✅ DELETE successful")
                else:
                    print("❌ DELETE failed")
            except Exception as e:
                print(f"❌ DELETE failed: {e}")

        else:
            print("❌ CREATE failed - no secret ID returned")

    except Exception as e:
        print(f"❌ CRUD test failed: {e}")


async def main():
    """Main debug function"""
    print("🔐 1Password Connect Debug Tool")
    print("=" * 50)

    # Test basic connectivity first
    settings = get_settings()
    if not settings.onepassword_enabled:
        print("❌ 1Password integration is disabled")
        return

    op_service = OnePasswordService(settings)
    try:
        await op_service.test_connectivity()
        print("✅ 1Password Connect connectivity OK")
    except Exception as e:
        print(f"❌ 1Password Connect connectivity failed: {e}")
        return

    # Run debug operations
    try:
        # 1. List vault contents
        vault_items = await debug_vault_contents()

        # 2. Compare with database
        await compare_database_with_vault()

        # 3. Test CRUD operations
        await test_secret_operations()

        # 4. Offer to test specific secrets
        if vault_items:
            asset_secrets = [item for item in vault_items if item.get('title', '').startswith('asset-')]
            if asset_secrets:
                print(f"\n🧪 Found {len(asset_secrets)} asset secrets in vault")
                response = input("Do you want to test retrieval of a specific secret? (y/N): ")
                if response.lower() in ['y', 'yes']:
                    print("\nAvailable secrets:")
                    for i, secret in enumerate(asset_secrets[:10]):
                        print(f"  {i+1}. {secret['title']} ({secret['id']})")

                    try:
                        choice = int(input("Enter number to test (1-10): ")) - 1
                        if 0 <= choice < len(asset_secrets):
                            selected_secret = asset_secrets[choice]
                            await test_specific_secret_retrieval(selected_secret['id'])
                    except (ValueError, IndexError):
                        print("Invalid choice")

    except Exception as e:
        print(f"Debug operation failed: {e}")

    print("\n💡 Debug Tips:")
    print("1. Check 1Password Connect server logs for detailed error messages")
    print("2. Verify API token permissions (read, write, delete)")
    print("3. Ensure vault name matches exactly (case-sensitive)")
    print("4. Test with 1Password CLI: op item list --vault='YourVaultName'")


if __name__ == "__main__":
    asyncio.run(main())

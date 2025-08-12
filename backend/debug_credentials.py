#!/usr/bin/env python3
"""
Comprehensive Debug Script for 1Password Credential Issues

This script will help identify exactly why credentials are still showing as defaults.
"""
import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from app.services.onepassword import OnePasswordService, OnePasswordError
from app.config import get_settings


async def debug_credential_logic():
    """Debug the credential checking logic step by step"""
    print("🔍 Debugging Credential Logic")
    print("=" * 50)

    settings = get_settings()
    op_service = OnePasswordService(settings)

    # Test different credential scenarios
    test_cases = [
        {
            "name": "None credentials",
            "mgmt_credentials": None,
            "os_credentials": None,
            "expected_mgmt_user": "root",  # idrac default
            "expected_os_user": "root"
        },
        {
            "name": "Empty dict credentials",
            "mgmt_credentials": {},
            "os_credentials": {},
            "expected_mgmt_user": "root",  # should fall back to defaults
            "expected_os_user": "root"
        },
        {
            "name": "Provided credentials",
            "mgmt_credentials": {"username": "test_mgmt_user", "password": "test_mgmt_pass"},
            "os_credentials": {"username": "test_os_user", "password": "test_os_pass"},
            "expected_mgmt_user": "test_mgmt_user",  # should use provided
            "expected_os_user": "test_os_user"
        },
        {
            "name": "Partial credentials",
            "mgmt_credentials": {"username": "partial_mgmt", "password": ""},
            "os_credentials": {"username": "", "password": "partial_os_pass"},
            "expected_mgmt_user": "partial_mgmt",
            "expected_os_user": "root"  # empty username should fall back to default
        }
    ]

    # Mock asset and controller
    class MockAsset:
        def __init__(self):
            self.id = "debug-test-asset"
            self.hostname = "debug-server"
            self.fqdn = "debug-server.test.com"
            self.location = "Debug Lab"
            self.type = "server"

    class MockController:
        def __init__(self):
            self.type = "idrac"
            self.address = "192.168.1.100"
            self.port = 443
            self.ui_url = "https://debug-server-idrac.test.com"

    mock_asset = MockAsset()
    mock_controller = MockController()

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test Case {i}: {test_case['name']}")
        print("-" * 30)

        print(f"Input mgmt_credentials: {test_case['mgmt_credentials']}")
        print(f"Input os_credentials: {test_case['os_credentials']}")

        try:
            # Build secret data and inspect the logic
            secret_data = op_service._build_secret_data(
                asset=mock_asset,
                mgmt_controller=mock_controller,
                mgmt_credentials=test_case['mgmt_credentials'],
                os_credentials=test_case['os_credentials']
            )

            # Extract actual values from the secret data
            fields = secret_data.get('fields', [])

            mgmt_username_field = next((f for f in fields if f.get('id') == 'mgmt_username'), None)
            actual_mgmt_user = mgmt_username_field.get('value') if mgmt_username_field else 'NOT_FOUND'

            os_username_field = next((f for f in fields if f.get('id') == 'os_username'), None)
            actual_os_user = os_username_field.get('value') if os_username_field else 'NOT_FOUND'

            print(f"Expected mgmt_username: '{test_case['expected_mgmt_user']}'")
            print(f"Actual mgmt_username:   '{actual_mgmt_user}'")

            print(f"Expected os_username: '{test_case['expected_os_user']}'")
            print(f"Actual os_username:   '{actual_os_user}'")

            # Check results
            mgmt_correct = actual_mgmt_user == test_case['expected_mgmt_user']
            os_correct = actual_os_user == test_case['expected_os_user']

            if mgmt_correct and os_correct:
                print("✅ PASSED")
            else:
                print("❌ FAILED")
                if not mgmt_correct:
                    print(f"   Management username mismatch!")
                if not os_correct:
                    print(f"   OS username mismatch!")

        except Exception as e:
            print(f"❌ ERROR: {e}")


async def test_real_credential_flow():
    """Test the actual credential flow with a real 1Password secret"""
    print(f"\n🔍 Testing Real Credential Flow")
    print("=" * 50)

    settings = get_settings()
    op_service = OnePasswordService(settings)

    # Create test asset with explicit credentials
    class MockAsset:
        def __init__(self):
            self.id = "real-flow-test"
            self.hostname = "real-flow-server"
            self.fqdn = "real-flow-server.test.com"
            self.location = "Real Test Lab"
            self.type = "server"

    class MockController:
        def __init__(self):
            self.type = "idrac"
            self.address = "10.10.10.100"
            self.port = 443
            self.ui_url = "https://real-flow-idrac.test.com"

    mock_asset = MockAsset()
    mock_controller = MockController()

    # Test with VERY specific credentials
    test_mgmt_creds = {
        "username": "EXPLICIT_MGMT_USER_123",
        "password": "EXPLICIT_MGMT_PASS_456"
    }

    test_os_creds = {
        "username": "EXPLICIT_OS_USER_789",
        "password": "EXPLICIT_OS_PASS_101"
    }

    print(f"Creating secret with EXPLICIT credentials:")
    print(f"  Management: {test_mgmt_creds}")
    print(f"  OS: {test_os_creds}")

    try:
        # Create the secret
        secret_id = await op_service.create_or_update_asset_secret(
            asset=mock_asset,
            mgmt_controller=mock_controller,
            mgmt_credentials=test_mgmt_creds,
            os_credentials=test_os_creds
        )

        if secret_id:
            print(f"✅ Secret created: {secret_id}")

            # Wait a moment then retrieve it
            await asyncio.sleep(2)

            try:
                secret_data = await op_service.get_asset_secret(secret_id)

                print(f"\n📋 Retrieved Secret Analysis:")
                fields = secret_data.get('fields', [])

                # Check each credential field
                credential_fields = [
                    ('mgmt_username', 'EXPLICIT_MGMT_USER_123'),
                    ('mgmt_password', 'EXPLICIT_MGMT_PASS_456'),
                    ('os_username', 'EXPLICIT_OS_USER_789'),
                    ('os_password', 'EXPLICIT_OS_PASS_101')
                ]

                for field_id, expected_value in credential_fields:
                    field = next((f for f in fields if f.get('id') == field_id), None)
                    if field:
                        actual_value = field.get('value', 'EMPTY')
                        if field_id.endswith('_password'):
                            # Passwords are concealed, just check they're not defaults
                            is_correct = actual_value not in ['changeme', '']
                            print(f"  {field_id}: {'✅ Custom password set' if is_correct else '❌ Default/empty password'}")
                        else:
                            is_correct = actual_value == expected_value
                            print(f"  {field_id}: {actual_value} {'✅' if is_correct else '❌'}")
                    else:
                        print(f"  {field_id}: ❌ FIELD NOT FOUND")

                # Check URL
                urls = secret_data.get('urls', [])
                if urls:
                    primary_url = urls[0].get('href', '')
                    print(f"  website URL: {primary_url} {'✅' if primary_url else '❌'}")
                else:
                    print(f"  website URL: ❌ NO URLS FOUND")

            except Exception as e:
                print(f"❌ Failed to retrieve secret: {e}")

            # Clean up
            # try:
            #     await op_service.delete_asset_secret(secret_id)
            #     print(f"✅ Cleaned up test secret")
            # except:
            #     print(f"⚠️  Could not clean up secret {secret_id}")

        else:
            print(f"❌ Secret creation failed - no ID returned")

    except Exception as e:
        print(f"❌ Real flow test failed: {e}")


async def main():
    """Main debug function"""
    print("🔧 1Password Credential Debug Tool")
    print("=" * 60)

    settings = get_settings()
    if not settings.onepassword_enabled:
        print("❌ 1Password integration is disabled")
        return

    # Test connectivity first
    op_service = OnePasswordService(settings)
    try:
        await op_service.test_connectivity()
        print("✅ 1Password Connect connectivity OK\n")
    except Exception as e:
        print(f"❌ 1Password Connect connectivity failed: {e}")
        return

    # Run debug tests
    await debug_credential_logic()
    await test_real_credential_flow()

    print(f"\n📝 Debug Summary:")
    print(f"This script tests the credential logic to identify why defaults are being used.")
    print(f"If tests show FAILED results, the credential checking logic needs further fixes.")


if __name__ == "__main__":
    asyncio.run(main())

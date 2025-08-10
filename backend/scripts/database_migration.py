#!/usr/bin/env python3
"""
Database Migration Script for 1Password Integration

Fixes existing assets with 1Password integration issues and backfills missing secrets.

Usage:
  python -m scripts.database_migration
  python scripts/database_migration.py
  cd scripts && python database_migration.py
"""
import asyncio
import os
import sys
import logging
from pathlib import Path
from sqlalchemy.orm import Session

# Add parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

try:
    from app.database import SessionLocal, engine
    from app.models import Asset, ManagementController
    from app.services.onepassword import OnePasswordService, OnePasswordError
    from app.config import get_settings
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"Current directory: {Path.cwd()}")
    print(f"Script directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    print("\nTry running from the backend/ directory:")
    print("  python -m scripts.database_migration")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_database_schema():
    """Check if the database has the required 1Password fields"""
    from sqlalchemy import inspect

    inspector = inspect(engine)
    columns = inspector.get_columns('assets')

    column_names = [col['name'] for col in columns]

    print("Current Asset table columns:")
    for col in columns:
        if 'onepassword' in col['name'].lower():
            print(f"  ✓ {col['name']} ({col['type']})")

    required_fields = ['onepassword_secret_id', 'onepassword_vault_id']
    missing_fields = [field for field in required_fields if field not in column_names]

    if missing_fields:
        print(f"\n❌ Missing required fields: {missing_fields}")
        print("You need to run database migrations:")
        print("  alembic revision --autogenerate -m 'Add 1Password fields'")
        print("  alembic upgrade head")
        return False
    else:
        print("\n✅ All required 1Password fields are present")
        return True


async def fix_assets_missing_1password_secrets():
    """Fix assets that should have 1Password secrets but don't"""
    db = SessionLocal()
    settings = get_settings()

    if not settings.onepassword_enabled:
        print("⚠️  1Password integration is disabled, skipping secret recreation")
        return 0

    try:
        # Find assets that don't have 1Password secrets but should
        assets_without_secrets = db.query(Asset).filter(
            Asset.onepassword_secret_id.is_(None)
        ).all()

        print(f"\nFound {len(assets_without_secrets)} assets without 1Password secrets")

        if not assets_without_secrets:
            print("✅ All assets already have 1Password secrets or none are needed")
            return 0

        # Ask user if they want to create secrets for these assets
        print("\nAssets without 1Password secrets:")
        for asset in assets_without_secrets[:10]:  # Show first 10
            print(f"  - {asset.hostname} (ID: {asset.id})")
        if len(assets_without_secrets) > 10:
            print(f"  ... and {len(assets_without_secrets) - 10} more")

        response = input(f"\nDo you want to create 1Password secrets for these {len(assets_without_secrets)} assets? (y/N): ")
        if response.lower() not in ['y', 'yes']:
            print("Skipping secret creation")
            return 0

        # Create 1Password service
        op_service = OnePasswordService(settings)

        # Test connectivity first
        try:
            await op_service.test_connectivity()
            vault_id = await op_service.get_vault_id()
            print(f"✅ Connected to 1Password (Vault: {vault_id})")
        except OnePasswordError as e:
            print(f"❌ Cannot connect to 1Password: {e}")
            return 0

        fixed_count = 0
        error_count = 0

        for asset in assets_without_secrets:
            try:
                print(f"Processing {asset.hostname}...", end=" ")

                # Get management controller if exists
                mgmt_controller = db.query(ManagementController).filter(
                    ManagementController.asset_id == asset.id
                ).first()

                # Create 1Password secret with default credentials
                # (since we don't have the original credentials)
                secret_id = await op_service.create_or_update_asset_secret(
                    asset=asset,
                    mgmt_controller=mgmt_controller,
                    mgmt_credentials=None,  # Will use defaults
                    os_credentials=None     # Will use defaults
                )

                if secret_id:
                    # Update asset with 1Password secret reference
                    asset.onepassword_secret_id = secret_id
                    asset.onepassword_vault_id = vault_id
                    db.add(asset)
                    db.commit()
                    db.refresh(asset)

                    fixed_count += 1
                    print("✅")
                else:
                    print("❌ No secret ID returned")
                    error_count += 1

            except OnePasswordError as e:
                logger.warning(f"Failed to create 1Password secret for {asset.hostname}: {e}")
                print("❌")
                error_count += 1

            except Exception as e:
                logger.error(f"Unexpected error for {asset.hostname}: {e}")
                print("❌")
                error_count += 1

        print(f"\n📊 Results:")
        print(f"✅ Successfully created secrets for {fixed_count} assets")
        if error_count > 0:
            print(f"❌ Failed to create secrets for {error_count} assets")

        return fixed_count

    except Exception as e:
        logger.error(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def fix_asset_1password_fields():
    """Fix any assets that might have inconsistent 1Password field values"""
    db = SessionLocal()
    try:
        # Find assets with potential field issues
        assets = db.query(Asset).all()

        fixed_count = 0
        issues_found = 0

        print(f"\nChecking {len(assets)} assets for 1Password field issues...")

        for asset in assets:
            has_issues = False

            # Check for empty string instead of None
            if asset.onepassword_secret_id and not asset.onepassword_secret_id.strip():
                asset.onepassword_secret_id = None
                has_issues = True
                logger.info(f"Fixed empty string secret_id for asset {asset.hostname}")

            # Check for missing vault_id when secret_id exists
            if asset.onepassword_secret_id and not asset.onepassword_vault_id:
                logger.warning(f"Asset {asset.hostname} has secret_id but no vault_id")
                issues_found += 1

            # Log current state for verification
            if asset.onepassword_secret_id:
                has_secret = bool(asset.onepassword_secret_id)
                secret_preview = asset.onepassword_secret_id[:8] + '...' if asset.onepassword_secret_id else 'None'
                print(f"  ✓ {asset.hostname}: secret_id={secret_preview}, has_secret={has_secret}")

            if has_issues:
                fixed_count += 1

        if fixed_count > 0:
            db.commit()
            print(f"\n✅ Fixed {fixed_count} assets with field issues")
        else:
            print(f"\n✅ No field issues found")

        if issues_found > 0:
            print(f"⚠️  Found {issues_found} assets that may need manual attention")

        return fixed_count

    except Exception as e:
        logger.error(f"Error during field fixes: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def verify_1password_integration():
    """Verify that 1Password integration is properly configured"""
    print("\n🔧 Verifying 1Password Configuration")
    print("=" * 40)

    settings = get_settings()

    config_issues = []

    if not settings.onepassword_enabled:
        config_issues.append("1Password integration is disabled (ONEPASSWORD_ENABLED=false)")
    else:
        print("✅ 1Password integration is enabled")

    if not settings.op_connect_host:
        config_issues.append("OP_CONNECT_HOST is not set")
    else:
        print(f"✅ Connect Host: {settings.op_connect_host}")

    if not settings.op_api_token:
        config_issues.append("OP_API_TOKEN is not set")
    else:
        print("✅ API Token is configured")

    if not settings.op_vault_name:
        config_issues.append("OP_VAULT_NAME is not set")
    else:
        print(f"✅ Vault Name: {settings.op_vault_name}")

    print(f"✅ Secret Template: {settings.op_secret_template}")
    print(f"✅ SSL Verify: {settings.op_ssl_verify}")

    if config_issues:
        print(f"\n❌ Configuration Issues Found:")
        for issue in config_issues:
            print(f"  - {issue}")
        return False
    else:
        print(f"\n✅ 1Password configuration looks good!")
        return True


async def main():
    """Main migration script"""
    print("🔧 Computer Inventory 1Password Integration Migration")
    print("=" * 55)

    # Step 1: Check database schema
    schema_ok = check_database_schema()
    if not schema_ok:
        print("\n❌ Database schema issues found. Please run migrations first.")
        return

    # Step 2: Verify configuration
    config_ok = verify_1password_integration()
    if not config_ok:
        print("\n❌ Configuration issues found. Please fix them before proceeding.")
        return

    # Step 3: Fix existing field issues
    try:
        field_fixes = fix_asset_1password_fields()
    except Exception as e:
        print(f"\n❌ Field fixes failed: {e}")
        return

    # Step 4: Create missing 1Password secrets
    try:
        secret_fixes = await fix_assets_missing_1password_secrets()
    except Exception as e:
        print(f"\n❌ Secret creation failed: {e}")
        return

    print(f"\n🎉 Migration completed successfully!")
    print(f"📊 Summary:")
    print(f"  - Field issues fixed: {field_fixes}")
    print(f"  - Secrets created: {secret_fixes}")

    if field_fixes == 0 and secret_fixes == 0:
        print("ℹ️  No issues were found that required fixing.")

    print("\n📝 Next Steps:")
    print("1. Restart your FastAPI application")
    print("2. Test the /api/v1/assets/upsert endpoint")
    print("3. Verify new assets get onepassword_secret_id populated")
    print("4. Check that has_onepassword_secret returns true in API responses")


def sync_main():
    """Synchronous wrapper for the async main function"""
    asyncio.run(main())


if __name__ == "__main__":
    sync_main()

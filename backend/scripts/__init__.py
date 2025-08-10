"""
Computer Inventory System - Management Scripts Package

This package contains various management and utility scripts for the
Computer Inventory System.

Available Scripts:
- test_onepassword.py - Test 1Password Connect integration
- database_migration.py - Fix database 1Password integration issues
- debug_1password.py - Debug 1Password vault contents
- migrate.py - Alembic migration helper

Usage:
    python -m scripts.test_onepassword
    python -m scripts.database_migration
    python -m scripts.debug_1password
    python -m scripts.migrate create -m "Add new fields"
"""

__version__ = "1.0.0"
__author__ = "Computer Inventory System"

# Import commonly used functions for easy access when importing the package
try:
    from app.config import get_settings
    from app.database import SessionLocal, check_db_connection
    from app.services.onepassword import OnePasswordService, OnePasswordError
except ImportError:
    # Handle case where app modules aren't available yet
    # This allows the package to be imported without the full app being available
    pass


def get_script_help():
    """Get help information for all available scripts"""
    scripts = {
        'test_onepassword': 'Test 1Password Connect integration and secret operations',
        'database_migration': 'Fix database 1Password integration issues and backfill secrets',
        'debug_1password': 'Debug 1Password vault contents and troubleshoot issues',
        'migrate': 'Helper for Alembic database migrations'
    }

    print("Computer Inventory System - Management Scripts")
    print("=" * 50)
    print("\nAvailable Scripts:")
    for script, description in scripts.items():
        print(f"  {script:<20} - {description}")

    print("\nUsage:")
    print("  python -m scripts.<script_name>")
    print("  python scripts/<script_name>.py")
    print("\nExamples:")
    print("  python -m scripts.test_onepassword")
    print("  python -m scripts.database_migration")
    print("  python -m scripts.migrate create -m 'Add new fields'")


# Common utilities that can be imported by scripts
class ScriptUtils:
    """Common utilities for scripts"""

    @staticmethod
    def get_user_confirmation(message: str, default: bool = False) -> bool:
        """Get yes/no confirmation from user"""
        suffix = " (Y/n)" if default else " (y/N)"
        response = input(f"{message}{suffix}: ").lower().strip()

        if not response:
            return default

        return response in ['y', 'yes', '1', 'true']

    @staticmethod
    def verify_database():
        """Verify database connectivity"""
        try:
            if not check_db_connection():
                print("❌ Database connection failed!")
                return False
            return True
        except Exception as e:
            print(f"❌ Database error: {e}")
            return False

    @staticmethod
    def verify_1password():
        """Verify 1Password configuration"""
        try:
            settings = get_settings()
            if not settings.onepassword_enabled:
                print("⚠️  1Password integration is disabled")
                return False

            if not all([settings.op_connect_host, settings.op_api_token, settings.op_vault_name]):
                print("❌ 1Password configuration incomplete")
                return False

            return True
        except Exception as e:
            print(f"❌ 1Password configuration error: {e}")
            return False

"""
Common utilities for management scripts
"""
import os
import sys
from pathlib import Path
from typing import Optional

# Ensure parent directory is in Python path
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from app.config import get_settings
from app.database import check_db_connection, SessionLocal
from app.services.onepassword import OnePasswordService, OnePasswordError


def setup_script_environment():
    """Common setup for all scripts"""
    settings = get_settings()
    return settings


def verify_database():
    """Verify database connectivity"""
    if not check_db_connection():
        print("❌ Database connection failed!")
        return False
    return True


def verify_1password():
    """Verify 1Password configuration"""
    settings = get_settings()
    if not settings.onepassword_enabled:
        print("⚠️  1Password integration is disabled")
        return False

    if not all([settings.op_connect_host, settings.op_api_token, settings.op_vault_name]):
        print("❌ 1Password configuration incomplete")
        return False

    return True


def get_user_confirmation(message: str, default: bool = False) -> bool:
    """Get yes/no confirmation from user"""
    suffix = " (Y/n)" if default else " (y/N)"
    response = input(f"{message}{suffix}: ").lower().strip()

    if not response:
        return default

    return response in ['y', 'yes', '1', 'true']

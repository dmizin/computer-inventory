#!/usr/bin/env python3
"""
Database Migration Helper Script

Wrapper around Alembic commands with common shortcuts and utilities.

Usage:
  python -m scripts.migrate create -m "Migration message"
  python -m scripts.migrate upgrade
  python -m scripts.migrate current
  python -m scripts.migrate history
  python scripts/migrate.py downgrade -1
"""
import argparse
import subprocess
import sys
import os
from pathlib import Path

# Add parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))


def run_command(cmd, capture_output=False):
    """Run a command and return the result"""
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")

    result = subprocess.run(
        cmd,
        capture_output=capture_output,
        text=True,
        shell=isinstance(cmd, str),
        cwd=str(parent_dir)  # Run from backend/ directory
    )

    if result.returncode != 0:
        print(f"Command failed with exit code {result.returncode}")
        if result.stderr:
            print(f"Error: {result.stderr}")
        return False

    if result.stdout and not capture_output:
        print(result.stdout)

    return True


def create_migration(message):
    """Create a new migration with auto-generated changes"""
    if not message:
        print("Error: Migration message required")
        return False

    cmd = ["alembic", "revision", "--autogenerate", "-m", message]
    return run_command(cmd)


def create_empty_migration(message):
    """Create an empty migration file"""
    if not message:
        print("Error: Migration message required")
        return False

    cmd = ["alembic", "revision", "-m", message]
    return run_command(cmd)


def upgrade_database(revision="head"):
    """Upgrade database to a revision"""
    cmd = ["alembic", "upgrade", revision]
    return run_command(cmd)


def downgrade_database(revision="-1"):
    """Downgrade database to a revision"""
    cmd = ["alembic", "downgrade", revision]
    return run_command(cmd)


def show_current():
    """Show current database revision"""
    cmd = ["alembic", "current", "--verbose"]
    return run_command(cmd)


def show_history():
    """Show migration history"""
    cmd = ["alembic", "history", "--verbose"]
    return run_command(cmd)


def stamp_database(revision):
    """Mark database as being at a specific revision without running migrations"""
    cmd = ["alembic", "stamp", revision]
    return run_command(cmd)


def generate_sql(revision="head"):
    """Generate SQL for migrations without applying them"""
    cmd = ["alembic", "upgrade", revision, "--sql"]
    return run_command(cmd)


def check_migrations():
    """Check if there are pending migrations"""
    print("Checking for pending migrations...")

    # Get current revision
    result = subprocess.run(
        ["alembic", "current"],
        capture_output=True,
        text=True,
        cwd=str(parent_dir)
    )

    if result.returncode != 0:
        print("Error checking current revision")
        return False

    current = result.stdout.strip()
    if not current or "None" in current:
        print("⚠️  No migrations applied yet")
        return True

    # Get head revision
    result = subprocess.run(
        ["alembic", "heads"],
        capture_output=True,
        text=True,
        cwd=str(parent_dir)
    )

    if result.returncode != 0:
        print("Error checking head revision")
        return False

    head = result.stdout.strip()

    if current in head:
        print("✅ Database is up to date")
    else:
        print("⚠️  There are pending migrations")
        print(f"Current: {current}")
        print(f"Head: {head}")

    return True


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description='Database migration helper',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s create -m "Add user table"          # Create new migration
  %(prog)s create-empty -m "Custom migration"  # Create empty migration
  %(prog)s upgrade                              # Upgrade to latest
  %(prog)s upgrade abc123                       # Upgrade to specific revision
  %(prog)s downgrade -1                         # Downgrade one step
  %(prog)s current                              # Show current revision
  %(prog)s history                              # Show migration history
  %(prog)s check                                # Check for pending migrations
  %(prog)s sql                                  # Show SQL without applying
  %(prog)s stamp head                           # Mark as up-to-date without migrating
        """
    )

    parser.add_argument('action',
                       choices=[
                           'create', 'create-empty', 'upgrade', 'downgrade',
                           'current', 'history', 'stamp', 'sql', 'check'
                       ],
                       help='Migration action to perform')

    parser.add_argument('-m', '--message',
                       help='Migration message (required for create actions)')

    parser.add_argument('-r', '--revision',
                       help='Target revision (for upgrade/downgrade/stamp)')

    args = parser.parse_args()

    # Ensure we're in the right directory
    if not Path(parent_dir / 'alembic.ini').exists():
        print(f"Error: alembic.ini not found in {parent_dir}")
        print("Make sure you're running this from the backend/ directory or its subdirectories")
        return 1

    print(f"Working directory: {parent_dir}")

    success = False

    if args.action == 'create':
        success = create_migration(args.message)

    elif args.action == 'create-empty':
        success = create_empty_migration(args.message)

    elif args.action == 'upgrade':
        revision = args.revision or 'head'
        success = upgrade_database(revision)

    elif args.action == 'downgrade':
        revision = args.revision or '-1'
        success = downgrade_database(revision)

    elif args.action == 'current':
        success = show_current()

    elif args.action == 'history':
        success = show_history()

    elif args.action == 'stamp':
        if not args.revision:
            print("Error: --revision required for stamp action")
            return 1
        success = stamp_database(args.revision)

    elif args.action == 'sql':
        revision = args.revision or 'head'
        success = generate_sql(revision)

    elif args.action == 'check':
        success = check_migrations()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Simple database connection test"""
from app.database import check_db_connection, get_db
from app.config import get_settings
from sqlalchemy import text

def main():
    print("Computer Inventory System - Database Connection Test")
    print("=" * 55)

    print("1. Testing basic database connection...")
    try:
        if check_db_connection():
            print("   Database connection successful")
        else:
            print("   Database connection failed")
            return 1
    except Exception as e:
        print(f"   Connection error: {e}")
        return 1

    print("2. Testing database session creation...")
    try:
        db = next(get_db())
        print("   Database session created")

        result = db.execute(text("SELECT current_database(), current_user, version()")).fetchone()
        print(f"   Database: {result[0]}")
        print(f"   User: {result[1]}")
        print(f"   PostgreSQL: {result[2].split(',')[0]}")

        db.close()
        print("   Database session closed")

    except Exception as e:
        print(f"   Session error: {e}")
        return 1

    print("3. Checking database extensions...")
    try:
        db = next(get_db())
        result = db.execute(text(
            "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm') ORDER BY extname"
        )).fetchall()

        extensions = [row[0] for row in result]
        if 'uuid-ossp' in extensions:
            print("   uuid-ossp extension available")
        if 'pg_trgm' in extensions:
            print("   pg_trgm extension available")

        db.close()

    except Exception as e:
        print(f"   Extension check failed: {e}")

    print("\nCONNECTION TEST COMPLETED!")
    print("Your database is ready for the Computer Inventory System.")
    print("\nNext steps:")
    print("1. Initialize tables: python init_db.py")
    print("2. Start development server: python run_dev.py")

    return 0

if __name__ == "__main__":
    exit(main())
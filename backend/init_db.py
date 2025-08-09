#!/usr/bin/env python3
"""Initialize the database for Computer Inventory System"""
from app.database import init_db, check_db_connection
from app.config import get_settings

def main():
    settings = get_settings()
    print(f"Initializing database for {settings.app_name}")

    try:
        print("Testing database connection...")
        if not check_db_connection():
            print("Database connection failed!")
            return 1
        print("Database connection successful")

        print("Creating database tables...")
        init_db()
        print("Database tables created successfully")

        from app.database import get_db
        from app.models import Asset

        db = next(get_db())
        try:
            count = db.query(Asset).count()
            print(f"Assets table accessible (current count: {count})")
        except Exception as e:
            print(f"Warning: Could not query assets table: {e}")
        finally:
            db.close()

        print("\nDATABASE INITIALIZATION COMPLETED!")
        print("Your backend is ready to start!")
        print("Run: python run_dev.py")

    except Exception as e:
        print(f"Database initialization failed: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())

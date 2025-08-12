# test_models.py
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.database import Base
import app.models

print("Available tables:")
for table_name, table in Base.metadata.tables.items():
    print(f"  - {table_name}")
    for column in table.columns:
        print(f"    {column.name}: {column.type}")

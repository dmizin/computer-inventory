cd backend/

# Management Scripts

## Available Scripts
- `test_onepassword.py` - Test 1Password Connect integration
- `database_migration.py` - Fix database 1Password integration issues
- `debug_1password.py` - Debug 1Password vault contents
- `migrate.py` - Alembic migration helper

## Usage
```bash
# From backend/ directory
python -m scripts.test_onepassword
python -m scripts.database_migration
```
### Update Script Import Paths
All scripts in the scripts/ directory need to handle imports properly. Each script should start with:

```python
"""
Script description
"""
import os
import sys
from pathlib import Path

# Add parent directory to Python path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

# Now import app modules
from app.config import get_settings
from app.services.onepassword import OnePasswordService, OnePasswordError
# ... other imports
```

#### File `backend/scripts/utils.py` for common functions


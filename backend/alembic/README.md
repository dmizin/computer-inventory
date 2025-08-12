## Database Operations

Starting from scratch or setting up on new database/machine. Initial database is created from `app/models` To track future changes setup alembic

```bash
pip install alembic
```

```bash
# initialize. existing files will not be overwritten
cd backend/
alembic init alembic
```

## Initialize Alembic's Migration History

### Create Empty Initial Migration


1. **Create an empty initial migration:**
```bash
alembic revision -m "Initial empty migration"
```

2. **Stamp the database with this empty migration:**
```bash
alembic stamp head
```

3. **Now create the real migration:**
```bash
alembic revision --autogenerate -m "Add all tables"
```

If all good - it will create empty migration file as your database should be to models


## Best Practices for Multi-Computer Development

### **Always Commit Migration Files to Git**
- Migration files in `alembic/versions/` should be committed
- Never add `alembic/versions/` to `.gitignore`
- Each migration represents a specific database state

### **Recommended Git Workflow**

```bash
# Daily workflow on any computer:

# 1. Start of day - sync everything
git pull origin main
alembic upgrade head

# 2. Make your changes to models
# Edit app/models.py

# 3. Generate migration
alembic revision --autogenerate -m "Descriptive message"

# 4. Review and test migration
cat alembic/versions/latest_migration_file.py
alembic upgrade head

# 5. Commit and push
git add .
git commit -m "Add feature X with database changes"
git push origin main
```

### **Troubleshooting Common Issues**

**Database out of sync:**
```bash
# Check what's different
alembic current
alembic history

# Force to specific revision if needed
alembic stamp revision_id
alembic upgrade head
```

**Migration conflicts:**
```bash
# See all heads
alembic heads

# Merge conflicts
alembic merge -m "Merge feature branches" head1 head2
```


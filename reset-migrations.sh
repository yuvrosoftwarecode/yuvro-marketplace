#!/bin/bash

# Script to delete all migration files from the backend
# This is useful when you need to regenerate migrations from scratch

set -e

echo "🧹 Resetting migrations for yuvro-marketplace backend..."
echo ""

# Function to delete migrations from a directory
delete_migrations() {
    local backend_path=$1
    local backend_name=$2
    
    if [ ! -d "$backend_path" ]; then
        echo "❌ Directory not found: $backend_path"
        return 1
    fi
    
    echo "Processing $backend_name..."
    
    # Find all migration files (excluding __init__.py and __pycache__)
    find "$backend_path" -type d -name "migrations" | while read migrations_dir; do
        echo "  Found migrations directory: $migrations_dir"
        
        # Delete all .py files except __init__.py
        find "$migrations_dir" -maxdepth 1 -name "*.py" ! -name "__init__.py" -type f -delete
        echo "  ✓ Deleted migration files from $migrations_dir"
        
        # Delete __pycache__ directory if it exists
        if [ -d "$migrations_dir/__pycache__" ]; then
            rm -rf "$migrations_dir/__pycache__"
            echo "  ✓ Deleted __pycache__ from $migrations_dir"
        fi
    done
    
    echo "✅ $backend_name migrations reset complete!"
    echo ""
}

# Reset Backend migrations
delete_migrations "backend" "Backend"

echo "🎉 All migrations have been reset!"
echo ""
echo "Next steps:"
echo "1. Run: make makemigrations"
echo "2. Run: make install"

#!/bin/bash

echo "🔍 Checking Local Environment..."

# Check Postgres
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL tools (psql) not found."
    echo "   Please install: brew install postgresql"
    exit 1
fi

echo "✅ psql found."

# Try connection
if psql postgres -c '\q' 2>/dev/null; then
    echo "✅ PostgreSQL is running."
else
    echo "❌ Could not connect to local PostgreSQL."
    echo "   Try starting it: brew services start postgresql"
    exit 1
fi

# Check DB
if psql match_me -c '\q' 2>/dev/null; then
    echo "✅ Database 'match_me' exists."
else
    echo "⚠️  Database 'match_me' not found. Creating..."
    createdb match_me
    if [ $? -eq 0 ]; then
        echo "✅ Created database 'match_me'."
    else
        echo "❌ Failed to create database."
        exit 1
    fi
fi

echo "🎉 Local Environment looks correct."
echo "   Next: Go to server-go/ and run the seeder."

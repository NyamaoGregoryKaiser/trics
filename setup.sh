#!/bin/bash

# Change to the repository directory
cd /opt/render/project/src

# Initialize Git if not already initialized
if [ ! -d ".git" ]; then
    git init
    git config user.name "NyamaoGregoryKaiser"
    git config user.email "your.email@example.com"
    git remote add origin https://github.com/NyamaoGregoryKaiser/trics.git
fi

# Force remove any existing submodules and clean up Git state
echo "Cleaning up repository state..."
git submodule deinit -f . || true
rm -rf .git/modules/* || true
rm -f .gitmodules || true
rm -rf active-project || true
git rm --cached -r active-project || true
git config --remove-section submodule.active-project || true

# Force clean the repository
echo "Cleaning untracked files..."
git clean -fdx

# Reset to a clean state
echo "Resetting repository..."
git reset --hard || true
git checkout --orphan temp_branch || true
git add -A || true
git commit -m "Initial commit" || true
git branch -D main || true
git branch -m main || true

# Force checkout main branch
echo "Setting up main branch..."
git checkout -f main || git checkout -b main

# If we're still in a detached HEAD state, create a new branch
if ! git branch --show-current > /dev/null 2>&1; then
    echo "Detached HEAD state detected, fixing..."
    current_commit=$(git rev-parse HEAD)
    git checkout -b main $current_commit
fi

# Reset to origin/main
echo "Resetting to origin/main..."
git fetch origin
git reset --hard origin/main || true

# Clean up any remaining untracked files
echo "Final cleanup..."
git clean -fd

# Ensure we're on main branch
git checkout -f main

# Configure Git to handle line endings properly
echo "Configuring Git line endings..."
git config core.autocrlf false
git config core.safecrlf true

echo "Git setup completed successfully" 
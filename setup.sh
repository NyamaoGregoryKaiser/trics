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

# Check if we're in a detached HEAD state
if ! git branch --show-current > /dev/null 2>&1; then
    echo "Detached HEAD state detected, fixing..."
    # Get the current commit hash
    current_commit=$(git rev-parse HEAD)
    # Create a temporary branch
    git checkout -b temp-branch $current_commit
    # Switch to master branch
    git checkout master || git checkout -b master
    # Delete the temporary branch
    git branch -D temp-branch
fi

# Ensure we're on the master branch
git checkout master

# Clean up any problematic submodules
if [ -f ".gitmodules" ]; then
    rm -f .gitmodules
    git rm --cached -r active-project
    rm -rf active-project
    git config --remove-section submodule.active-project || true
fi

# Fetch and reset to origin/master
git fetch origin
git reset --hard origin/master

echo "Git setup completed successfully" 
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

# Force remove any existing submodules
echo "Cleaning up submodules..."
git submodule deinit -f . || true
rm -rf .git/modules/* || true
rm -f .gitmodules || true
rm -rf active-project || true
git rm --cached -r active-project || true
git config --remove-section submodule.active-project || true

# Force checkout master branch
echo "Ensuring we're on master branch..."
git checkout -f master || git checkout -b master

# If we're still in a detached HEAD state, create a new branch
if ! git branch --show-current > /dev/null 2>&1; then
    echo "Detached HEAD state detected, fixing..."
    current_commit=$(git rev-parse HEAD)
    git checkout -b master $current_commit
fi

# Reset to origin/master
echo "Resetting to origin/master..."
git fetch origin
git reset --hard origin/master || true

# Clean up any untracked files
echo "Cleaning up untracked files..."
git clean -fd

# Ensure we're on master branch
git checkout -f master

echo "Git setup completed successfully" 
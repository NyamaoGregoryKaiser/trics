const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function cleanupGit() {
  try {
    console.log('Starting Git cleanup...');
    
    // Change to the repository directory
    process.chdir('/opt/render/project/src');
    
    // Remove any existing .git directory and reinitialize
    if (fs.existsSync('.git')) {
      console.log('Removing existing Git repository...');
      fs.rmSync('.git', { recursive: true, force: true });
    }
    
    // Remove any submodule directories
    if (fs.existsSync('active-project')) {
      console.log('Removing active-project directory...');
      fs.rmSync('active-project', { recursive: true, force: true });
    }
    
    // Remove .gitmodules if it exists
    if (fs.existsSync('.gitmodules')) {
      console.log('Removing .gitmodules file...');
      fs.unlinkSync('.gitmodules');
    }
    
    // Initialize new Git repository
    console.log('Initializing new Git repository...');
    execSync('git init');
    execSync('git config user.name "NyamaoGregoryKaiser"');
    execSync('git config user.email "your.email@example.com"');
    execSync('git remote add origin https://github.com/NyamaoGregoryKaiser/trics.git');
    
    // Configure Git
    console.log('Configuring Git...');
    execSync('git config core.autocrlf false');
    execSync('git config core.safecrlf true');
    
    // Fetch and checkout main branch
    console.log('Fetching and setting up main branch...');
    execSync('git fetch origin');
    execSync('git checkout -b main origin/main');
    
    // Clean any untracked files
    console.log('Cleaning untracked files...');
    execSync('git clean -fdx');
    
    // Reset to origin/main
    console.log('Resetting to origin/main...');
    execSync('git reset --hard origin/main');
    
    console.log('Git cleanup completed successfully');
  } catch (error) {
    console.error('Error during Git cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupGit(); 
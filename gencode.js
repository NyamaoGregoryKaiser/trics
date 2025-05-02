// Daily GitHub Contribution Script
// This script automatically generates code and pushes to GitHub daily
// to maintain an active contribution history

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const express = require('express');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Setup logging
const logStream = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });
const errorStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    logStream.write(logMessage);
}

function error(message) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}\n`;
    console.error(message);
    errorStream.write(errorMessage);
}

// Load configuration
let CONFIG;
try {
  CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (error) {
  console.error('Error loading config.json. Please make sure it exists and contains valid JSON.');
  process.exit(1);
}

// Add additional configuration
CONFIG.repoPath = path.join(__dirname, 'active-project');
CONFIG.languages = [
  { name: 'javascript', ext: 'js', comment: '//' },
  { name: 'python', ext: 'py', comment: '#' }
];
CONFIG.projectTypes = [
  'web-app',
  'api-service',
  'data-visualization',
  'utility-library'
];
CONFIG.commitInterval = 24 * 60 * 60 * 1000; // Daily (in milliseconds)

// Track project state
let projectState = {
  shouldCreateNewProject: true,
  lastProject: null
};

// Initialize by cloning repo or creating a new one if it doesn't exist
function initializeRepo() {
  if (!fs.existsSync(CONFIG.repoPath)) {
    console.log('Initializing repository...');
    fs.mkdirSync(CONFIG.repoPath, { recursive: true });
    
    try {
      process.chdir(CONFIG.repoPath);
      execSync('git init');
      execSync(`git config user.name "${CONFIG.githubUsername}"`);
      execSync(`git config user.email "${CONFIG.githubEmail}"`);
      
      // Create README.md
      fs.writeFileSync(
        path.join(CONFIG.repoPath, 'README.md'),
        `# Active Development Project\n\nThis repository contains various coding projects and experiments that are actively maintained.\n\nStarted on: ${new Date().toISOString().split('T')[0]}\n`
      );
      
      execSync('git add README.md');
      execSync('git commit -m "Initial commit: Project setup"');
      
      // Try to add remote and push (might fail if repo doesn't exist on GitHub yet)
      try {
        execSync(`git remote add origin ${CONFIG.repoUrl}`);
        execSync('git branch -M main');
        execSync('git push -u origin main');
        console.log('Initial commit pushed to remote repository');
      } catch (e) {
        console.log('Could not push to remote. You may need to create the repository on GitHub first.');
        console.log(`After creating the repository, run: git remote add origin ${CONFIG.repoUrl} && git push -u origin main`);
      }
    } catch (e) {
      console.error('Error during repository initialization:', e.message);
    }
  } else {
    console.log('Repository already exists, pulling latest changes...');
    process.chdir(CONFIG.repoPath);
    try {
      // Ensure we're on the main branch
      execSync('git checkout -b main');
      // Remove any problematic submodules
      try {
        execSync('git rm --cached active-project');
        fs.rmSync(path.join(CONFIG.repoPath, 'active-project'), { recursive: true, force: true });
      } catch (e) {
        console.log('No active-project submodule to remove');
      }
      // Pull latest changes
      execSync(`git pull origin ${CONFIG.branch}`);
      console.log('Latest changes pulled from remote repository');
    } catch (e) {
      console.error('Error pulling from repository:', e.message);
    }
  }
}

// Generate a random project if none exists
function ensureProjectExists() {
  const projects = getDirectories(CONFIG.repoPath)
    .filter(dir => dir !== '.git' && !dir.startsWith('.'));
  
  if (projectState.shouldCreateNewProject || projects.length === 0) {
    // Create new project
    const newProject = createNewProject();
    projectState.lastProject = newProject;
    projectState.shouldCreateNewProject = false; // Next time, add to existing
    return [newProject];
  } else {
    // Add to existing project
    const targetProject = projectState.lastProject || getRandomItem(projects);
    addCodeToProject(targetProject);
    projectState.shouldCreateNewProject = true; // Next time, create new
    return projects;
  }
}

// Get all directories in a given path
function getDirectories(source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

// Create a new random project
function createNewProject() {
  const projectType = getRandomItem(CONFIG.projectTypes);
  const language = getRandomItem(CONFIG.languages);
  const projectName = `${projectType}-${generateRandomName()}`;
  const projectDir = path.join(CONFIG.repoPath, projectName);
  
  console.log(`Creating new project: ${projectName} (${language.name})`);
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  // Create project structure based on project type
  createProjectStructure(projectDir, projectType, language);
  
  return projectName;
}

// Generate random name for project
function generateRandomName() {
  const adjectives = ['awesome', 'brilliant', 'clever', 'dynamic', 'elegant', 'fast', 'great', 'helpful'];
  const nouns = ['app', 'tool', 'system', 'framework', 'service', 'platform', 'solution', 'utility'];
  
  return `${getRandomItem(adjectives)}-${getRandomItem(nouns)}-${Math.floor(Math.random() * 1000)}`;
}

// Create basic project structure based on type
function createProjectStructure(projectDir, projectType, language) {
  // Create basic structure
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
  
  // Create README
  fs.writeFileSync(
    path.join(projectDir, 'README.md'),
    `# ${path.basename(projectDir)}\n\nA ${projectType} project written in ${language.name}.\n\nCreated on: ${new Date().toISOString().split('T')[0]}\n`
  );
  
  // Create basic project files based on project type
  switch (projectType) {
    case 'web-app':
      createWebAppFiles(projectDir, language);
      break;
    case 'api-service':
      createApiServiceFiles(projectDir, language);
      break;
    case 'data-visualization':
      createDataVizFiles(projectDir, language);
      break;
    case 'utility-library':
      createUtilityLibraryFiles(projectDir, language);
      break;
    case 'game':
      createGameFiles(projectDir, language);
      break;
    case 'mobile-app':
      createMobileAppFiles(projectDir, language);
      break;
    default:
      createBasicFiles(projectDir, language);
  }

  // Add, commit, and push the files
  try {
    process.chdir(projectDir);
    execSync('git add .');
    execSync(`git commit -m "Initial commit: ${projectType} project setup"`);
    execSync('git push origin main');
    console.log('Changes pushed to remote repository');
  } catch (e) {
    console.error('Error pushing to remote repository:', e.message);
  }
}

// Helper function to create web app files
function createWebAppFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  
  // Create HTML file with modern structure
  fs.writeFileSync(
    path.join(srcDir, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${path.basename(projectDir)}</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
      <a class="navbar-brand" href="#">${path.basename(projectDir)}</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link active" href="#">Home</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#">Features</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#">About</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <div class="container mt-4">
    <div class="row">
      <div class="col-md-8">
        <h1>Welcome to ${path.basename(projectDir)}</h1>
        <p class="lead">A modern web application built with the latest technologies.</p>
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Features</h5>
            <ul class="list-group list-group-flush">
              <li class="list-group-item">Responsive Design</li>
              <li class="list-group-item">Modern UI Components</li>
              <li class="list-group-item">Interactive Elements</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Quick Stats</h5>
            <div class="progress mb-2">
              <div class="progress-bar" role="progressbar" style="width: 75%">75%</div>
            </div>
            <p class="card-text">Project Completion</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <footer class="bg-dark text-white mt-5 py-3">
    <div class="container text-center">
      <p>Created on ${new Date().toISOString().split('T')[0]}</p>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="app.js"></script>
</body>
</html>`
  );
  
  // Create CSS file with modern styling
  fs.writeFileSync(
    path.join(srcDir, 'styles.css'),
    `/* Modern CSS with custom variables and animations */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --background-color: #f8f9fa;
  --text-color: #212529;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
}

.navbar {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card {
  border: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}

.progress {
  height: 20px;
  border-radius: 10px;
  background-color: #e9ecef;
}

.progress-bar {
  background-color: var(--primary-color);
  border-radius: 10px;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: fadeIn 0.5s ease-in;
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  .card {
    margin-bottom: 20px;
  }
}`
  );
  
  // Create JavaScript file with interactive features
  fs.writeFileSync(
    path.join(srcDir, 'app.js'),
    `// Modern JavaScript with ES6+ features
class App {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeComponents();
  }

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      // Add smooth scrolling to all links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
          });
        });
      });

      // Add animation to cards on scroll
      const cards = document.querySelectorAll('.card');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1 });

      cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        observer.observe(card);
      });
    });
  }

  initializeComponents() {
    // Initialize any third-party components here
    console.log('Application initialized');
  }
}

// Initialize the application
const app = new App();`
  );
}

// Helper function to create API service files
function createApiServiceFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  
  if (language.name === 'javascript') {
    // Create package.json
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      `{
  "name": "${path.basename(projectDir)}",
  "version": "1.0.0",
  "description": "A modern API service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "mongoose": "^7.0.3",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  }
}`
    );

    // Create main server file
    fs.writeFileSync(
      path.join(srcDir, 'index.js'),
      `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Example resource endpoints
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
    );

    // Create environment file
    fs.writeFileSync(
      path.join(projectDir, '.env'),
      `PORT=3000
MONGODB_URI=mongodb://localhost:27017/${path.basename(projectDir)}
NODE_ENV=development`
    );

    // Create README with setup instructions
    fs.writeFileSync(
      path.join(projectDir, 'README.md'),
      `# ${path.basename(projectDir)}

A modern API service built with Node.js and Express.

## Features

- RESTful API endpoints
- Security middleware (Helmet)
- CORS support
- Request logging
- Environment configuration
- Error handling

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Create a .env file with your configuration

3. Start the server:
\`\`\`bash
npm start
\`\`\`

For development with auto-reload:
\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

- GET /api/health - Health check endpoint
- GET /api/users - Get list of users

## Testing

Run tests with:
\`\`\`bash
npm test
\`\`\`
`
    );
  } else if (language.name === 'python') {
    // Create requirements.txt
    fs.writeFileSync(
      path.join(projectDir, 'requirements.txt'),
      `fastapi==0.95.0
uvicorn==0.21.1
pydantic==1.10.7
python-dotenv==1.0.0
pytest==7.3.1`
    );

    // Create main server file
    fs.writeFileSync(
      path.join(srcDir, 'main.py'),
      `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uvicorn
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="${path.basename(projectDir)}",
    description="A modern API service built with FastAPI",
    version="1.0.0"
)

class User(BaseModel):
    id: int
    name: str
    email: str

# In-memory database
users = [
    User(id=1, name="John Doe", email="john@example.com"),
    User(id=2, name="Jane Smith", email="jane@example.com")
]

@app.get("/")
async def root():
    return {"message": "Welcome to ${path.basename(projectDir)} API"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/users", response_model=List[User])
async def get_users():
    return users

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    user = next((user for user in users if user.id == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)`
    );

    // Create README with setup instructions
    fs.writeFileSync(
      path.join(projectDir, 'README.md'),
      `# ${path.basename(projectDir)}

A modern API service built with FastAPI.

## Features

- FastAPI framework
- Pydantic models
- Automatic API documentation
- Type hints
- Async support

## Setup

1. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

2. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

3. Start the server:
\`\`\`bash
uvicorn src.main:app --reload
\`\`\`

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run tests with:
\`\`\`bash
pytest
\`\`\`
`
    );
  }
}

// Helper function to create data visualization files
function createDataVizFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  const dataDir = path.join(projectDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  
  // Sample data
  fs.writeFileSync(
    path.join(dataDir, 'sample_data.json'),
    `[
  {"date": "2023-01-01", "value": 10},
  {"date": "2023-01-02", "value": 15},
  {"date": "2023-01-03", "value": 13},
  {"date": "2023-01-04", "value": 17},
  {"date": "2023-01-05", "value": 20},
  {"date": "2023-01-06", "value": 18},
  {"date": "2023-01-07", "value": 22}
]`
  );
  
  if (language.name === 'javascript') {
    // Create HTML file
    fs.writeFileSync(
      path.join(srcDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Visualization</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
  <header>
    <h1>Data Visualization Project</h1>
  </header>
  <main>
    <div id="chart"></div>
  </main>
  <script src="visualization.js"></script>
</body>
</html>`
    );
    
    // Create JS file
    fs.writeFileSync(
      path.join(srcDir, 'visualization.js'),
      `// Data visualization using D3.js
document.addEventListener('DOMContentLoaded', async () => {
  // Load data
  const data = await d3.json('../data/sample_data.json');
  
  // Set up dimensions
  const margin = {top: 20, right: 30, bottom: 30, left: 40};
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
  
  // X scale
  const x = d3.scaleBand()
    .domain(data.map(d => d.date))
    .range([0, width])
    .padding(0.1);
  
  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .nice()
    .range([height, 0]);
  
  // X axis
  svg.append('g')
    .attr('transform', \`translate(0,\${height})\`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em')
    .attr('transform', 'rotate(-45)');
  
  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y));
  
  // Bars
  svg.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.date))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.value))
    .attr('fill', 'steelblue');
});`
    );
    
    // Create CSS file
    fs.writeFileSync(
      path.join(srcDir, 'styles.css'),
      `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

#chart {
  max-width: 800px;
  margin: 0 auto;
}

.bar:hover {
  fill: #ff7f0e;
}`
    );
  } else if (language.name === 'python') {
    fs.writeFileSync(
      path.join(srcDir, 'visualization.py'),
      `# Data visualization using matplotlib and pandas
import pandas as pd
import matplotlib.pyplot as plt
import json
import os

def load_data():
    """Load the sample data"""
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_data.json')
    with open(data_path, 'r') as f:
        return json.load(f)

def create_visualization():
    """Create and save a visualization"""
    # Load data
    data = load_data()
    df = pd.DataFrame(data)
    
    # Convert date to datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Create plot
    plt.figure(figsize=(10, 6))
    plt.bar(df['date'], df['value'], color='steelblue')
    plt.xlabel('Date')
    plt.ylabel('Value')
    plt.title('Sample Data Visualization')
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save the figure
    output_path = os.path.join(os.path.dirname(__file__), '..', 'output')
    os.makedirs(output_path, exist_ok=True)
    plt.savefig(os.path.join(output_path, 'visualization.png'))
    print(f"Visualization saved to {os.path.join(output_path, 'visualization.png')}")

if __name__ == "__main__":
    create_visualization()`
    );
    
    // Create requirements.txt
    fs.writeFileSync(
      path.join(projectDir, 'requirements.txt'),
      `pandas==1.3.5
matplotlib==3.5.1
jupyterlab==3.2.8`
    );
  }
}

// Helper function to create utility library files
function createUtilityLibraryFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  const testDir = path.join(projectDir, 'tests');
  fs.mkdirSync(testDir, { recursive: true });
  
  if (language.name === 'javascript') {
    // Main utility file
    fs.writeFileSync(
      path.join(srcDir, `utils.${language.ext}`),
      `/**
 * Utility library with helpful functions
 */

/**
 * Formats a date according to the specified format
 * @param {Date} date - The date to format
 * @param {string} format - The format string (e.g., 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Generates a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} Random string
 */
function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Deep clones an object
 * @param {object} obj - The object to clone
 * @returns {object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

module.exports = {
  formatDate,
  randomString,
  deepClone,
  debounce
};`
    );
    
    // Test file
    fs.writeFileSync(
      path.join(testDir, `utils.test.${language.ext}`),
      `// Tests for the utility functions
const { formatDate, randomString, deepClone, debounce } = require('../src/utils');

// Test formatDate function
test('formatDate formats dates correctly', () => {
  const date = new Date(2023, 0, 15, 10, 30, 45); // Jan 15, 2023, 10:30:45
  expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-01-15');
  expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2023');
  expect(formatDate(date, 'DD.MM.YYYY HH:mm')).toBe('15.01.2023 10:30');
});

// Test randomString function
test('randomString generates string of correct length', () => {
  expect(randomString(5).length).toBe(5);
  expect(randomString(10).length).toBe(10);
  expect(randomString().length).toBe(10); // Default length
});

// Test deepClone function
test('deepClone creates a deep copy of an object', () => {
  const original = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
  const clone = deepClone(original);
  
  // Modify clone
  clone.a = 99;
  clone.b.c = 98;
  clone.d[0] = 97;
  
  // Original should be unchanged
  expect(original.a).toBe(1);
  expect(original.b.c).toBe(2);
  expect(original.d[0]).toBe(1);
});

// Helper function to test debounce
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test debounce function (async)
test('debounce delays function execution', async () => {
  let counter = 0;
  const increment = () => { counter++; };
  const debouncedIncrement = debounce(increment, 100);
  
  // Call multiple times
  debouncedIncrement();
  debouncedIncrement();
  debouncedIncrement();
  
  // Counter should still be 0 immediately
  expect(counter).toBe(0);
  
  // Wait for debounce
  await sleep(150);
  
  // Counter should be 1 after the wait
  expect(counter).toBe(1);
});

function test(name, testFn) {
  try {
    testFn();
    console.log(\`✓ \${name}\`);
  } catch (error) {
    console.error(\`✗ \${name}\`);
    console.error(error);
  }
}`
    );
    
    // Package.json
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      `{
  "name": "${path.basename(projectDir)}",
  "version": "0.1.0",
  "description": "Utility library with helpful functions",
  "main": "src/utils.js",
  "scripts": {
    "test": "node tests/utils.test.js"
  }
}`
    );
  } else if (language.name === 'python') {
    // Main utility file
    fs.writeFileSync(
      path.join(srcDir, 'utils.py'),
      `# Utility functions library

import random
import string
import json
import datetime
import time
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union

def format_date(date: datetime.datetime, format_str: str = "%Y-%m-%d") -> str:
    """
    Format a date according to the specified format
    
    Args:
        date: The date to format
        format_str: The format string (e.g., '%Y-%m-%d')
        
    Returns:
        Formatted date string
    """
    return date.strftime(format_str)

def random_string(length: int = 10) -> str:
    """
    Generate a random string of specified length
    
    Args:
        length: Length of the string to generate
        
    Returns:
        Random string
    """
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def deep_clone(obj: Any) -> Any:
    """
    Deep clone an object
    
    Args:
        obj: The object to clone
        
    Returns:
        Cloned object
    """
    return json.loads(json.dumps(obj))

def debounce(wait: float = 0.3):
    """
    Decorator to debounce a function
    
    Args:
        wait: The time to wait in seconds
        
    Returns:
        Debounced function
    """
    def decorator(fn):
        last_time_called = None
        timer = None
        result = None
        
        @wraps(fn)
        def debounced(*args, **kwargs):
            nonlocal last_time_called, timer, result
            
            def call_function():
                nonlocal last_time_called, result
                result = fn(*args, **kwargs)
                last_time_called = time.time()
                return result
                
            current_time = time.time()
            
            if timer is not None:
                timer.cancel()
                
            if last_time_called is None or (current_time - last_time_called) >= wait:
                return call_function()
            else:
                timer = threading.Timer(wait - (current_time - last_time_called), call_function)
                timer.start()
                return result
                
        return debounced
    return decorator`
    );
    
    // Test file
    fs.writeFileSync(
      path.join(testDir, 'test_utils.py'),
      `# Tests for utility functions

import unittest
import datetime
import time
from src.utils import format_date, random_string, deep_clone, debounce

class TestUtils(unittest.TestCase):
    def test_format_date(self):
        """Test that format_date formats dates correctly"""
        date = datetime.datetime(2023, 1, 15, 10, 30, 45)
        self.assertEqual(format_date(date, "%Y-%m-%d"), "2023-01-15")
        self.assertEqual(format_date(date, "%m/%d/%Y"), "01/15/2023")
        self.assertEqual(format_date(date, "%d.%m.%Y %H:%M"), "15.01.2023 10:30")
        
    def test_random_string(self):
        """Test that random_string generates strings of correct length"""
        self.assertEqual(len(random_string(5)), 5)
        self.assertEqual(len(random_string(10)), 10)
        self.assertEqual(len(random_string()), 10)  # Default length
        
    def test_deep_clone(self):
        """Test that deep_clone creates a deep copy of an object"""
        original = {"a": 1, "b": {"c": 2}, "d": [1, 2, 3]}
        clone = deep_clone(original)
        
        # Modify clone
        clone["a"] = 99
        clone["b"]["c"] = 98
        clone["d"][0] = 97
        
        # Original should be unchanged
        self.assertEqual(original["a"], 1)
        self.assertEqual(original["b"]["c"], 2)
        self.assertEqual(original["d"][0], 1)
        
    def test_debounce(self):
        """Test that debounce delays function execution"""
        counter = 0
        
        @debounce(0.1)
        def increment():
            nonlocal counter
            counter += 1
            return counter
            
        # Call multiple times
        increment()
        increment()
        increment()
        
        # Counter should still be 0 immediately
        self.assertEqual(counter, 0)
        
        # Wait for debounce
        time.sleep(0.15)
        
        # Counter should be 1 after the wait
        self.assertEqual(counter, 1)
        
if __name__ == '__main__':
    unittest.main()`
    );
    
    // Requirements file
    fs.writeFileSync(
      path.join(projectDir, 'requirements.txt'),
      `pytest==6.2.5`
    );
  }
}

// Helper function to create game files
function createGameFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  const assetsDir = path.join(projectDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  if (language.name === 'javascript') {
    // Create HTML file
    fs.writeFileSync(
      path.join(srcDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Game</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="game-container">
    <h1>Simple Game</h1>
    <div class="game-area">
      <canvas id="gameCanvas" width="640" height="480"></canvas>
    </div>
    <div class="controls">
      <button id="startBtn">Start Game</button>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>`
    );
  }
}

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to create mobile app files
function createMobileAppFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  
  // Create basic app structure
  if (language.name === 'javascript') {
    fs.writeFileSync(
      path.join(srcDir, 'App.js'),
      `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Mobile App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});`
    );
  }
}

// Helper function to create basic files
function createBasicFiles(projectDir, language) {
  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  
  if (language.name === 'javascript') {
    fs.writeFileSync(
      path.join(srcDir, 'index.js'),
      `console.log('Basic project structure created');`
    );
  }
}

// Add new code to an existing project
function addCodeToProject(projectDir) {
  const projectPath = path.join(CONFIG.repoPath, projectDir);
  const srcDir = path.join(projectPath, 'src');
  
  // Read the project's README to determine its type
  const readmePath = path.join(projectPath, 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const projectType = readmeContent.match(/A (.*?) project/)[1];
  
  console.log(`Adding new code to existing project: ${projectDir} (${projectType})`);
  
  // Add new code based on project type
  switch (projectType) {
    case 'web-app':
      addWebAppCode(projectPath);
      break;
    case 'api-service':
      addApiServiceCode(projectPath);
      break;
    case 'data-visualization':
      addDataVizCode(projectPath);
      break;
    case 'utility-library':
      addUtilityLibraryCode(projectPath);
      break;
  }
  
  // Commit and push the changes
  try {
    process.chdir(projectPath);
    // Ensure we're on the main branch
    execSync('git checkout -b main');
    // Add all files
    execSync('git add .');
    // Commit changes
    execSync(`git commit -m "Add new features and improvements"`);
    // Push to remote
    execSync(`git push origin ${CONFIG.branch}`);
    console.log('Changes pushed to remote repository');
  } catch (e) {
    console.error('Error pushing to remote repository:', e.message);
  }
}

// Add new code to web app
function addWebAppCode(projectDir) {
  const srcDir = path.join(projectDir, 'src');
  
  // Add new component
  fs.writeFileSync(
    path.join(srcDir, 'components', 'new-feature.js'),
    `// New feature component
class NewFeature {
  constructor() {
    this.init();
  }

  init() {
    console.log('New feature initialized');
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      // Add new interactive elements
      const elements = document.querySelectorAll('.interactive-element');
      elements.forEach(element => {
        element.addEventListener('click', () => {
          this.handleClick(element);
        });
      });
    });
  }

  handleClick(element) {
    element.classList.toggle('active');
    console.log('Element clicked:', element);
  }
}

// Initialize the new feature
const newFeature = new NewFeature();`
  );
  
  // Add new styles
  fs.writeFileSync(
    path.join(srcDir, 'styles', 'new-feature.css'),
    `.interactive-element {
  padding: 1rem;
  margin: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.interactive-element:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
}

.interactive-element.active {
  background-color: #e0e0e0;
  border-color: #999;
}`
  );
}

// Add new code to API service
function addApiServiceCode(projectDir) {
  const srcDir = path.join(projectDir, 'src');
  
  // Add new endpoint
  fs.appendFileSync(
    path.join(srcDir, 'index.js'),
    `\n// New feature endpoints
app.get('/api/new-feature', (req, res) => {
  res.json({
    message: 'This is a new feature endpoint',
    timestamp: new Date().toISOString(),
    data: {
      id: Math.floor(Math.random() * 1000),
      name: 'New Feature',
      status: 'active'
    }
  });
});

// New middleware
app.use((req, res, next) => {
  console.log('New feature middleware:', req.method, req.path);
  next();
});`
  );
}

// Add new code to data visualization
function addDataVizCode(projectDir) {
  const srcDir = path.join(projectDir, 'src');
  
  // Add new visualization
  fs.writeFileSync(
    path.join(srcDir, 'visualizations', 'new-chart.js'),
    `// New chart visualization
class NewChart {
  constructor(data) {
    this.data = data;
    this.init();
  }

  init() {
    this.setupCanvas();
    this.drawChart();
  }

  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 400;
    document.getElementById('chart-container').appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  drawChart() {
    // Draw the chart
    this.ctx.fillStyle = '#007bff';
    this.data.forEach((point, index) => {
      const x = index * 50;
      const y = 400 - point.value;
      this.ctx.fillRect(x, y, 40, point.value);
    });
  }
}

// Initialize the chart
const chart = new NewChart([
  { value: 50 },
  { value: 75 },
  { value: 25 },
  { value: 100 },
  { value: 60 }
]);`
  );
}

// Add new code to utility library
function addUtilityLibraryCode(projectDir) {
  const srcDir = path.join(projectDir, 'src');
  
  // Add new utility functions
  fs.appendFileSync(
    path.join(srcDir, 'utils.js'),
    `\n/**
 * Generates a random color in hex format
 * @returns {string} Random hex color
 */
function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

/**
 * Formats a number with commas
 * @param {number} num - The number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeWords(str) {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Export new functions
module.exports = {
  ...module.exports,
  randomColor,
  formatNumber,
  capitalizeWords
};`
  );
  
  // Add tests for new functions
  fs.appendFileSync(
    path.join(projectDir, 'tests', 'utils.test.js'),
    `\n// Test new utility functions
test('randomColor generates valid hex color', () => {
  const color = randomColor();
  expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
});

test('formatNumber adds commas correctly', () => {
  expect(formatNumber(1000)).toBe('1,000');
  expect(formatNumber(1000000)).toBe('1,000,000');
  expect(formatNumber(123)).toBe('123');
});

test('capitalizeWords capitalizes each word', () => {
  expect(capitalizeWords('hello world')).toBe('Hello World');
  expect(capitalizeWords('this is a test')).toBe('This Is A Test');
});`
  );
}

// Main execution
async function main() {
  try {
    log('Starting code generation process...');
    initializeRepo();
    const projects = ensureProjectExists();
    log('Projects created:', projects);
    log('Code generation completed successfully');
  } catch (err) {
    error(`Error in main process: ${err.message}`);
    error(err.stack);
  }
}

// Schedule the job to run every 6 hours
cron.schedule('0 */6 * * *', () => {
    log('Scheduled job started');
    main().catch(err => {
        error(`Scheduled job failed: ${err.message}`);
    });
});

// Run immediately on startup
main().catch(err => {
    error(`Initial run failed: ${err.message}`);
});

const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
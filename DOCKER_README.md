# 🐳 SmarTanom Mobile App - Docker Setup Guide

This guide will help you set up and run the SmarTanom mobile application using Docker. With this setup, you can run the app on any device without installing Node.js, Expo CLI, or any other dependencies locally - **just Docker!**

## 🎯 What This Setup Does

- ✅ Runs the complete SmarTanom React Native/Expo app in a container
- ✅ Provides web interface for testing in browser
- ✅ Generates QR code for mobile device testing
- ✅ Includes hot reloading for development
- ✅ Works on Windows, Mac, and Linux
- ✅ No need to install Node.js, Expo CLI, or any dependencies

## 📋 Step 1: Install Docker

### For Windows:
1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Run the installer and follow the setup wizard
3. Restart your computer when prompted
4. Open Docker Desktop and wait for it to start

### For Mac:
1. Download Docker Desktop for Mac from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Drag Docker to Applications folder
3. Launch Docker from Applications
4. Follow the setup instructions

### For Linux (Ubuntu/Debian):
```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
```

### ✅ Verify Docker Installation:
Open terminal/command prompt and run:
```bash
docker --version
docker-compose --version
```
You should see version numbers for both commands.

## 📁 Step 2: Get the Project

### Option A: Clone from Repository
```bash
git clone <your-repository-url>
cd SmarTanom
```

### Option B: Download ZIP
1. Download the project ZIP file
2. Extract it to a folder
3. Open terminal/command prompt in that folder

## 🚀 Step 3: Run the Application

### Simple One-Command Start:
```bash
docker-compose up
```

**That's it!** This single command will:
- Download and build the Docker image (first time only)
- Install all dependencies automatically
- Start the Expo development server
- Show you QR code and URLs

### Alternative - Run in Background:
```bash
docker-compose up -d
```
Then view logs with:
```bash
docker-compose logs -f
```

## 📱 Step 4: Access Your App

After running the command, you'll see output like this:
```
🚀 Starting SmarTanom Mobile App...
📱 Web interface will be available at: http://localhost:3000
📱 Expo DevTools will be available at: http://localhost:19002

› Metro waiting on exp://0.0.0.0:8081
› Scan the QR code above with Expo Go
› Web is waiting on http://localhost:8081
```

### Access Options:

#### 🌐 Web Browser (Easiest for testing):
- Open your browser and go to: **http://localhost:3000**

#### 📱 Mobile Device (Real device testing):
1. **Install Expo Go app** on your phone:
   - **Android**: Search "Expo Go" in Google Play Store
   - **iOS**: Search "Expo Go" in App Store
2. **Scan the QR code** displayed in your terminal
3. The app will load on your phone!

#### 🛠️ Developer Tools:
- **Expo DevTools**: http://localhost:19002
- **Metro Bundler**: http://localhost:8081

## 🛑 Step 5: Stop the Application

When you're done testing:
```bash
# If running in foreground, press Ctrl+C, then:
docker-compose down

# If running in background:
docker-compose down
```

## 🔄 Daily Usage Workflow

### Starting Work:
```bash
# Navigate to project folder
cd SmarTanom

# Start the app
docker-compose up
```

### Testing:
- **Web**: Open http://localhost:3000 in browser
- **Mobile**: Use Expo Go app to scan QR code

### Stopping:
```bash
# Stop the app
docker-compose down
```

## 📱 Mobile Device Testing Guide

### For Android:
1. Install **Expo Go** from Google Play Store
2. Make sure your phone and computer are on the same WiFi network
3. Open Expo Go app
4. Tap "Scan QR Code"
5. Scan the QR code from your terminal

### For iOS:
1. Install **Expo Go** from App Store
2. Make sure your phone and computer are on the same WiFi network
3. Open Expo Go app
4. Tap "Scan QR Code"
5. Scan the QR code from your terminal

### If QR Code Doesn't Work:
```bash
# Use tunnel mode for remote access
docker-compose exec smartanom-mobile npx expo start --tunnel
```

## 🛠️ Useful Commands Reference

### Essential Commands (Most Used):
```bash
# Start the app
docker-compose up

# Start in background
docker-compose up -d

# Stop the app
docker-compose down

# View live logs
docker-compose logs -f

# Restart if something goes wrong
docker-compose restart
```

### Advanced Commands:
```bash
# Access container shell (for debugging)
docker-compose exec smartanom-mobile bash

# Clear Expo cache (if app behaves strangely)
docker-compose exec smartanom-mobile npx expo r -c

# Force rebuild (if you change dependencies)
docker-compose build --no-cache

# Check container status
docker-compose ps
```

### Alternative Easy Commands (if Makefile is available):
```bash
make up          # Start the app
make down        # Stop the app
make logs        # View logs
make restart     # Restart the app
make clean       # Clean up everything
```

## 🔧 Configuration Options

### Environment Variables
Create a `.env` file in the root directory:
```env
# Clear cache on startup
CLEAR_CACHE=false

# Node environment
NODE_ENV=development

# Expo configuration
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
```

### Port Configuration
Default ports used:
- **3000**: Web development server
- **8081**: Metro bundler
- **19000-19002**: Expo development servers

To change ports, modify `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3001 to your preferred port
```

## ❗ Troubleshooting Common Issues

### 🔧 Problem: "Port already in use"
**Solution:**
```bash
# Stop any running containers first
docker-compose down

# If that doesn't work, find what's using the port
netstat -tulpn | grep :3000

# Kill the process or restart your computer
```

### 🔧 Problem: "Docker command not found"
**Solution:**
- Make sure Docker Desktop is installed and running
- Restart your terminal/command prompt
- On Windows, make sure you're using Command Prompt or PowerShell, not Git Bash

### 🔧 Problem: "Permission denied" (Linux/Mac)
**Solution:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or restart your computer
```

### 🔧 Problem: Mobile device can't connect
**Solutions:**
1. **Check WiFi**: Make sure phone and computer are on same network
2. **Try tunnel mode**:
   ```bash
   docker-compose exec smartanom-mobile npx expo start --tunnel
   ```
3. **Check firewall**: Temporarily disable firewall to test

### 🔧 Problem: App not loading or behaving strangely
**Solution:**
```bash
# Clear cache and restart
docker-compose down
docker-compose exec smartanom-mobile npx expo r -c
docker-compose up
```

### 🔧 Problem: "Build failed" or dependency issues
**Solution:**
```bash
# Force rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### 🆘 Nuclear Option - Reset Everything:
```bash
# This will delete everything and start fresh
docker-compose down -v
docker system prune -af
docker-compose build --no-cache
docker-compose up
```

## � Quick Reference Card

### 🚀 Essential Commands:
```bash
# Start app:           docker-compose up
# Stop app:            docker-compose down
# View logs:           docker-compose logs -f
# Restart:             docker-compose restart
# Reset everything:    docker-compose down && docker-compose build --no-cache && docker-compose up
```

### 🌐 Important URLs:
- **Web App**: http://localhost:3000
- **Expo DevTools**: http://localhost:19002
- **Metro Bundler**: http://localhost:8081

### 📱 Mobile Testing:
1. Install "Expo Go" app on your phone
2. Run `docker-compose up`
3. Scan QR code with Expo Go app

## � For Team Members

### First Time Setup:
1. **Install Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Clone the project** or download ZIP
3. **Open terminal** in project folder
4. **Run**: `docker-compose up`
5. **Open browser** to http://localhost:3000

### Daily Development:
```bash
# Start working
cd SmarTanom
docker-compose up

# Test on phone
# Use Expo Go app to scan QR code

# Stop working
docker-compose down
```

## 📁 Project Structure
```
SmarTanom/
├── smartanom-mobile/          # React Native/Expo app source code
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Container orchestration
├── docker-entrypoint.sh       # Startup script
├── Makefile                   # Easy commands
├── setup-docker.sh            # Automated setup
├── .dockerignore              # Build optimization
└── DOCKER_README.md           # This guide
```

## 🎯 What You Get

✅ **Zero Setup Hassle** - No Node.js, Expo CLI, or dependency installation needed
✅ **Cross-Platform** - Works on Windows, Mac, Linux
✅ **Mobile Ready** - Instant QR code for device testing
✅ **Hot Reloading** - Changes appear instantly
✅ **Team Friendly** - Same environment for everyone
✅ **Production Ready** - Easy deployment configuration

## 📞 Need Help?

1. **Check troubleshooting section above**
2. **View logs**: `docker-compose logs -f`
3. **Ask team members** who have it working
4. **Try the nuclear option**: Reset everything and start fresh

## 🎉 Success Indicators

When everything is working, you should see:
- ✅ Terminal shows QR code and URLs
- ✅ Web interface loads at http://localhost:3000
- ✅ Mobile app loads when scanning QR code
- ✅ Changes in code appear instantly (hot reload)

**Happy coding with Docker! 🚀📱**

---
*This setup eliminates the "it works on my machine" problem - if it works in Docker, it works everywhere!*

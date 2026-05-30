# Render Deployment Guide for Omuscle

This guide provides detailed step-by-step instructions for deploying the Omuscle application (Next.js web app + Socket.io server) to Render.

## Prerequisites

Before starting, ensure you have:
- A GitHub, GitLab, or Bitbucket account with your code repository
- A Render account (free tier available at https://render.com)
- The `render.yaml` file committed to your repository
- The updated `package.json` with `start:socket` script

## Architecture Overview

Omuscle requires **two separate services** on Render:

1. **Socket Server** (`omuscle-socket`)
   - Handles real-time WebSocket connections
   - Runs on Node.js
   - Must be deployed first
   - URL example: `https://omuscle-socket.onrender.com`

2. **Web Application** (`omuscle-web`)
   - Next.js frontend
   - Connects to the socket server
   - Requires `NEXT_PUBLIC_SOCKET_URL` environment variable

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Commit all changes** to your local repository:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Verify files are committed**:
   - `render.yaml` (deployment configuration)
   - `package.json` (with `start:socket` script)
   - `socket-server/index.mjs` (socket server code)
   - All Next.js application files

### Step 2: Create a Render Account

1. Go to https://render.com
2. Click "Sign Up" or "Log In"
3. Connect your GitHub, GitLab, or Bitbucket account
4. Authorize Render to access your repositories

### Step 3: Deploy the Socket Server First

**Why first?** The web app needs the socket server's URL to connect.

1. **Navigate to Render Dashboard**:
   - Go to https://dashboard.render.com
   - Click "New +" button

2. **Select "Web Service"**:
   - Choose "Web Service" from the options
   - Click "Next"

3. **Connect Your Repository**:
   - Find your Omuscle repository
   - Click "Connect"
   - Select the branch (usually `main` or `master`)

4. **Configure the Socket Service**:
   - **Name**: `omuscle-socket`
   - **Region**: Choose the region closest to your users (e.g., Oregon, Frankfurt)
   - **Branch**: `main` (or your main branch)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:socket`

5. **Add Environment Variables**:
   - Scroll to "Environment" section
   - Click "Add Environment Variable"
   - Add:
     - Key: `PORT`
     - Value: `10000`
     - Key: `NODE_ENV`
     - Value: `production`

6. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (2-5 minutes)
   - Monitor the logs for any errors

7. **Copy the Socket Server URL**:
   - Once deployed, you'll see a URL like: `https://omuscle-socket.onrender.com`
   - **Save this URL** - you'll need it for the web app
   - Test it by visiting the URL (should show nothing or a simple response)

### Step 4: Deploy the Next.js Web Application

1. **Navigate to Render Dashboard**:
   - Go back to https://dashboard.render.com
   - Click "New +" button

2. **Select "Web Service"**:
   - Choose "Web Service"
   - Click "Next"

3. **Connect Your Repository**:
   - Select the same Omuscle repository
   - Click "Connect"

4. **Configure the Web Service**:
   - **Name**: `omuscle-web`
   - **Region**: Choose the same region as the socket server
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

5. **Add Environment Variables**:
   - Scroll to "Environment" section
   - Click "Add Environment Variable"
   - Add:
     - Key: `NEXT_PUBLIC_SOCKET_URL`
     - Value: `[PASTE YOUR SOCKET SERVER URL HERE]`
       - Example: `https://omuscle-socket.onrender.com`
       - **Important**: Include the full URL with `https://`
     - Key: `PORT`
     - Value: `10000`
     - Key: `NODE_ENV`
     - Value: `production`

6. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (3-5 minutes)
   - Monitor the logs for any errors

### Step 5: Verify Both Services

1. **Check Socket Server**:
   - Go to your Render dashboard
   - Click on `omuscle-socket` service
   - Verify status is "Live"
   - Check the logs for any errors
   - The logs should show: `🔌  Omuscle socket server  →  http://localhost:10000`

2. **Check Web Application**:
   - Go to your Render dashboard
   - Click on `omuscle-web` service
   - Verify status is "Live"
   - Click the URL to open the web app
   - Navigate to `/arena` to test the arena feature

### Step 6: Test the Arena Feature

1. **Open the Arena Page**:
   - Visit your web app URL
   - Navigate to `/arena` or click "Enter Arena"

2. **Check Connection Status**:
   - You should see "Connected to arena server" (green dot)
   - If you see "Connecting…" for more than 10 seconds, there's a connection issue

3. **Test Matchmaking**:
   - Open the arena page in two different browser windows
   - Click "Join Arena" on both
   - They should match and proceed to camera check

### Step 7: Troubleshooting Common Issues

#### Issue: "Can't reach match server" error

**Possible causes**:
1. Socket server not deployed
2. `NEXT_PUBLIC_SOCKET_URL` not set correctly
3. Socket server is down or crashing
4. CORS configuration issue

**Solutions**:
1. Verify socket server is running in Render dashboard
2. Check `NEXT_PUBLIC_SOCKET_URL` environment variable in web service
3. Check socket server logs for errors
4. Ensure socket server URL is correct (include `https://`)

#### Issue: "Connection error: websocket error"

**Possible causes**:
1. Socket server URL is incorrect
2. Socket server is not accepting connections
3. Firewall or network issue

**Solutions**:
1. Double-check the socket server URL
2. Check socket server logs for connection attempts
3. Ensure both services are in the same region

#### Issue: Socket server keeps crashing

**Possible causes**:
1. Missing dependencies
2. Port conflict
3. Runtime error in socket server code

**Solutions**:
1. Check socket server logs for error messages
2. Verify `package.json` has all required dependencies
3. Ensure PORT environment variable is set to 10000

#### Issue: Web app builds but doesn't start

**Possible causes**:
1. Build errors
2. Missing environment variables
3. Start command incorrect

**Solutions**:
1. Check build logs for errors
2. Verify all environment variables are set
3. Ensure `npm start` works locally

### Step 8: Alternative: Using render.yaml (Automatic Deployment)

If you prefer automatic deployment using the `render.yaml` file:

1. **Ensure render.yaml is committed** to your repository

2. **Go to Render Dashboard**:
   - Click "New +"
   - Select "Blueprints" (if available) or "Web Service"

3. **Connect Repository**:
   - Select your repository
   - Render will detect the `render.yaml` file

4. **Review Configuration**:
   - Render will show you the services it will create
   - Verify the configuration looks correct

5. **Deploy**:
   - Click "Apply" or "Create Resources"
   - Wait for both services to deploy

6. **Set Environment Variable**:
   - After socket server deploys, copy its URL
   - Go to web service settings
   - Add `NEXT_PUBLIC_SOCKET_URL` with the socket server URL
   - Redeploy the web service

### Step 9: Monitoring and Logs

**Viewing Logs**:
1. Go to Render dashboard
2. Click on a service (socket or web)
3. Click "Logs" tab
4. View real-time logs to debug issues

**Common Log Messages**:
- Socket server: `🔌  Omuscle socket server  →  http://localhost:10000`
- Connection: `+ connect [socket-id]`
- Arena queue: `Arena queue: [socket-id] joined (total: X)`

### Step 10: Updating the Application

When you make changes to the code:

1. **Commit and push** changes to your repository
2. Render will automatically detect the push
3. Both services will automatically redeploy
4. Monitor the deployment logs for errors

### Important Notes

- **Free Tier Limitations**: Render's free tier spins down services after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds.
- **Environment Variables**: `NEXT_PUBLIC_` prefixed variables are exposed to the browser, so don't put secrets there.
- **Region Selection**: Choose the same region for both services to minimize latency.
- **HTTPS Only**: Render provides HTTPS automatically. Always use `https://` in URLs.
- **Port**: Render uses port 10000 by default for web services.

### Cost Considerations

- **Free Tier**: Both services can run on Render's free tier
- **Limitations**: 512 MB RAM, 0.1 CPU, spin-down after inactivity
- **Paid Tier**: For production, consider upgrading to prevent spin-down
- **Estimated Cost**: ~$7/month per service for basic paid tier

### Security Best Practices

1. **Environment Variables**: Never commit secrets to the repository
2. **CORS**: The socket server allows all origins (`*`) - consider restricting in production
3. **Rate Limiting**: Consider adding rate limiting to the socket server
4. **Authentication**: Add authentication for production use

### Support and Resources

- Render Documentation: https://render.com/docs
- Socket.io Documentation: https://socket.io/docs/
- Next.js Deployment: https://nextjs.org/docs/deployment

## Summary

Deploying Omuscle to Render requires:
1. Deploying the socket server first
2. Copying its URL
3. Deploying the web app with the socket server URL as an environment variable
4. Testing the connection between both services

The key is ensuring the web app knows where to find the socket server via the `NEXT_PUBLIC_SOCKET_URL` environment variable.

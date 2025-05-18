#!/bin/bash

# This script is used during deployment on Render
# It ensures all directories are created and environment is set up correctly

echo "Starting Render setup..."

# Create necessary directories
mkdir -p ./data
mkdir -p ./session
mkdir -p ./auth-info-multi

# Move existing session files to data directory if they exist
if [ -d "./session" ] && [ "$(ls -A ./session)" ]; then
  echo "Moving session files to data directory"
  cp -r ./session/* ./data/
fi

# Move auth files to data directory if they exist
if [ -d "./auth-info-multi" ] && [ "$(ls -A ./auth-info-multi)" ]; then
  echo "Moving auth files to data directory"
  cp -r ./auth-info-multi/* ./data/
fi

# Create symbolic links to ensure data persistence
ln -sf /opt/render/project/src/data/session ./session
ln -sf /opt/render/project/src/data/auth-info-multi ./auth-info-multi

# Check if we need to create config.env
if [ ! -f "config.env" ]; then
  echo "Creating config.env from environment variables"
  
  # Create config.env from environment variables
  cat > config.env << EOL
VPS=${VPS:-true}
HEROKU=${HEROKU:-false}
KOYEB=${KOYEB:-false}
BOT_NAME=${BOT_NAME:-Levanter}
PREFIX=${PREFIX:-.}
SESSION_ID=${SESSION_ID:-levanter_session}
MODE=${MODE:-private}
LANGUAGE=${LANGUAGE:-en}
DATABASE_URL=${DATABASE_URL:-sqlite:./data/levanter.db}
SUDO=${SUDO:-}
OWNER_NAME=${OWNER_NAME:-Owner}
MAX_PROCESS_TIME=${MAX_PROCESS_TIME:-60}
MAX_UPLOAD_SIZE=${MAX_UPLOAD_SIZE:-100}
ANTI_LINK=${ANTI_LINK:-false}
ANTI_BOT=${ANTI_BOT:-false}
BAD_WORD_DETECT=${BAD_WORD_DETECT:-false}
AUTO_READ=${AUTO_READ:-false}
ALWAYS_ONLINE=${ALWAYS_ONLINE:-false}
AUTO_REACTION=${AUTO_REACTION:-false}
READ_RECEIPT=${READ_RECEIPT:-false}
DISABLE_PM=${DISABLE_PM:-false}
LOG_MSG=${LOG_MSG:-false}
LOG_LEVEL=${LOG_LEVEL:-info}
EOL
fi

echo "Render setup completed successfully!"

# Exit with success
exit 0

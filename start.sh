#!/bin/sh
export NVM_DIR="/home/radio/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Start Icecast2 in the background
icecast2 -c /icecast/icecast.xml &

# Start Liquidsoap (in the foreground, so the container doesn't exit)
liquidsoap /liquidsoap/radio.liq &

cd /controller && npm i && npm run start

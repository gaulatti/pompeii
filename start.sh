#!/bin/sh
# su - radio -c "icecast2 -c /icecast.xml";

# Start Icecast2 in the background
icecast2 -c /icecast.xml &

# Start Liquidsoap (in the foreground, so the container doesn't exit)
liquidsoap /radio.liq

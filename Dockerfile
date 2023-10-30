# Use Debian as the base image
FROM debian:bullseye-slim

# Set environment variables to non-interactive (this ensures Debian doesn't prompt for user input during installation)
ENV DEBIAN_FRONTEND=noninteractive

# Add the Liquidsoap repository for the latest version and MP3 support
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https && \
    curl -sS https://deb.liquidsoap.info/pubkey.gpg | apt-key add - && \
    echo "deb https://deb.liquidsoap.info/debian bullseye main" > /etc/apt/sources.list.d/liquidsoap.list && \
    apt-get update

# Install Icecast and Liquidsoap with necessary codecs
RUN apt-get install -y icecast2 liquidsoap liquidsoap-plugin-all && \
    rm -rf /var/lib/apt/lists/*

# Copy the Liquidsoap script and assets
COPY ./radio.liq /radio.liq
COPY ./assets/ /assets/

# Copy the Icecast configuration
COPY icecast.xml /icecast.xml

# Copy the startup script and make it executable
COPY start.sh /start.sh
RUN chmod +x /start.sh
RUN useradd -ms /bin/bash radio
RUN mkdir -p /var/log/icecast2 && chown -R radio:radio /var/log/icecast2

USER radio

# Command to run when the container starts
CMD ["/start.sh"]

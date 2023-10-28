# Use Debian as the base image
FROM debian:bullseye-slim

# Set environment variables to non-interactive (this ensures Debian doesn't prompt for user input during installation)
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary tools and software
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    icecast2 \
    liquidsoap && \
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

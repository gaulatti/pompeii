# Use Debian as the base image
FROM debian:bullseye-slim

# Set environment variables to non-interactive (this ensures Debian doesn't prompt for user input during installation)
ENV DEBIAN_FRONTEND=noninteractive

# Add the Liquidsoap repository for the latest version and MP3 support
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    icecast2 \
    liquidsoap \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy the project files
COPY ./controller /controller
COPY ./liquidsoap /liquidsoap
COPY ./icecast /icecast
COPY ./assets /assets
COPY ./start.sh /start.sh

# Make the start.sh script executable
RUN chmod +x /start.sh

# Create a new user for running our application
RUN useradd -ms /bin/bash radio

# Create and set permissions for the icecast log directory
RUN mkdir -p /var/log/icecast2 && chown -R radio:radio /var/log/icecast2
RUN chown -R radio:radio /controller /liquidsoap /icecast /assets

# Switch to the radio user
USER radio
WORKDIR /home/radio

# Install NVM and Node.js as the radio user
ENV NVM_DIR /home/radio/.nvm
ENV NODE_VERSION 18
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm use $NODE_VERSION \
    && nvm alias default $NODE_VERSION

# Command to run when the container starts
CMD ["/start.sh"]

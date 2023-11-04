# Use Ubuntu as the base image
FROM ubuntu:mantic

ENV DEBIAN_FRONTEND=noninteractive

# Install necessary tools and software
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    software-properties-common \
    icecast2 \
    opam \
    m4 \
    bubblewrap \
    build-essential \
    pkg-config \
    libssl-dev \
    libpcre3-dev \
    libfdk-aac-dev \
    libmad0-dev \
    libmp3lame-dev \
    libtag1-dev \
    libfaad-dev \
    libvorbis-dev \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN add-apt-repository main
RUN add-apt-repository universe
RUN add-apt-repository restricted
RUN add-apt-repository multiverse

RUN echo $(lsb_release -a)
RUN apt-get install -y libsamplerate0-dev \
    libcurl4-gnutls-dev

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

# Initialize OPAM
RUN opam init --disable-sandboxing -y
RUN opam update
# RUN opam install opam-depext -y
RUN opam install taglib mad lame vorbis cry samplerate ocurl liquidsoap -y
ENV PATH /home/radio/.opam/default/bin:$PATH

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

FROM i386/debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        nano \
        vim \
        wget \
    && rm -rf /var/lib/apt/lists/*

CMD ["/bin/bash"]

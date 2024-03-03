# Using Rocky Linux 8.x as base image to support rpmbuild
FROM rockylinux:8.9

# Copying all contents of rpmbuild repo inside container
# hadolint disable=DL3045
COPY . .

# Installing tools needed for rpmbuild ,
# depends on BuildRequires field in specfile, (TODO: take as input & install)
# hadolint disable=DL3041
RUN dnf install -y --allowerasing \
  curl \
  tar \
  rpm-build \
  rpmdevtools \
  gcc \
  make \
  coreutils \
  python39 \
  git \
  && dnf clean all

# Setting up node to run our JS file
# Download Node Linux binary
ENV NODE_VER=v20.11.1
ENV NODE_PKG=node-${NODE_VER}-linux-x64.tar.xz
RUN curl -O https://nodejs.org/dist/$NODE_VER/$NODE_PKG \
  && tar --strip-components 1 -xvf $NODE_PKG -C /usr/local \
  && rm $NODE_PKG

# Install dependecies and build main.js
RUN npm install \
&& npm run-script build

# All remaining logic goes inside main.js ,
# where we have access to both tools of this container and
# contents of git repo at /github/workspace
ENTRYPOINT ["node", "/dist/main.js"]

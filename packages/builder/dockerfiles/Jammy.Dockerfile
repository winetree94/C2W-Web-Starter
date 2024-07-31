FROM ubuntu:22.04

RUN \
  apt-get update && apt-get upgrade -y

RUN \
  apt-get install curl neofetch -y

ENTRYPOINT ["/bin/bash"]

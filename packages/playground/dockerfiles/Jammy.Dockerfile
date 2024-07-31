FROM ubuntu:22.04

RUN apt-get update

RUN apt-get install curl -y

ENTRYPOINT ["/bin/bash"]

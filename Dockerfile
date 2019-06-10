FROM node:12.4

RUN apt-get update && \
  apt-get install -y lsof vim libgtk-3-0 libatk1.0-0 libx11-xcb1 libnss3 libxss1 libasound2

WORKDIR /code/

ADD package-lock.json /code/package-lock.json
ADD package.json /code/package.json

RUN npm install

ADD ember-app-boilerplate /code/ember-app-boilerplate
ADD lib /code/lib
ADD test /code/test
ADD . /code/

ENTRYPOINT "/bin/bash"

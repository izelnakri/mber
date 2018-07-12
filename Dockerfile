FROM node:10

WORKDIR /code/

ADD package.json /code/package.json

RUN npm install -g ava
RUN npm install

ADD ember-app-boilerplate /code/ember-app-boilerplate
ADD lib /code/lib
ADD scripts /code/scripts
ADD vendor /code/vendor
ADD test /code/test
ADD . /code/

ENTRYPOINT "/bin/bash"

FROM node:10

# Create app directory
WORKDIR /usr/src/app
VOLUME /usr/src/app
EXPOSE 4200

# have to rebuild node-sass to get the proper linux binding (only applicable for MAC/Windows hosts)
CMD npm rebuild node-sass && npx ng serve --host 0.0.0.0 --disable-host-check
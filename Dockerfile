FROM node:16-alpine3.15

# Create usergroup socketioChat and add System user socketioChat to avoid running with root
RUN addgroup socketioChat && adduser -S -G socketioChat socketioChat
RUN mkdir /app && chown socketioChat:socketioChat /app

# Set workdir to be /app
WORKDIR /app

# Copy package.json files before copy dir files to avoid unnecessary rebuild of node_modules layer
# Give read access for package files to socketioChat user so he can run npm i
COPY --chown=socketioChat:socketioChat /app/package*.json ./
RUN npm install
# Copy host workdir app code to container workdir
COPY ./app/dist ./dist

# Set permissions for build command
RUN chmod u=rwx,g=rwx,o=rwx /app/dist/*

# expose port for communication
EXPOSE 3000

# set user to zerocli
USER socketioChat

# start app
CMD ["npm", "run", "prod"]
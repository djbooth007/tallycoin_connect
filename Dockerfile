FROM node:14-buster-slim
WORKDIR /opt/tallycoin_connect

# Install and update system dependencies
RUN apt-get update
RUN npm install -g npm

# Configure and start app
COPY . .
RUN npm install
EXPOSE 8123
ENV NODE_ENV production
ENTRYPOINT ["npm"]
CMD ["start"]

FROM node:16-buster-slim
WORKDIR /opt/tallycoin_connect

# Configure and start app
COPY . .
RUN npm install
EXPOSE 8123
ENV NODE_ENV production
ENTRYPOINT ["npm"]
CMD ["start"]

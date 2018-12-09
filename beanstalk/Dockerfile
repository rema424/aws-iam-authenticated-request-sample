FROM node:8.10

# install dependencies
WORKDIR /opt/app
ADD . /opt/app
RUN npm cache clean --force && npm install --production

# set application PORT and expose docker PORT, 80 is what Elastic Beanstalk expects
ENV PORT 8000
EXPOSE 8000

CMD [ "npm", "run", "start" ]

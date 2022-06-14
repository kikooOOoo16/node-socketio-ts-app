<!-- PROJECT LOGO -->
<p align="center">
  <h3 align="center">Node SocketIO TS API</h3>
  <p align="center">
    A Node SocketIO API developed to communicate with an Angular FE
    <br/>
    <br/>
    <a href="https://github.com/kikooOOoo16/ng-socketio-chat">Angular SocketIO FE</a>
  </p>
</p>
<br/>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#initialisation">Initialisation</a></li>
      </ul>
    </li>
    <li><a href="#Docker">Docker</a></li>
  </ol>
</details>
<br/>


<!-- ABOUT THE PROJECT -->
## About The Project

A Node SocketIO chat API.
The features that the API provides are the following:
* User authentication and authorization.
* Chat room CRUD operations.
* Chat room functionality.
* Edit chat message.
* Profane language filter for chat messages as well as chat room create and update operations.
* Winston Logger for app activity and error messages tracking.

## Built With

* [NodeJS](https://nodejs.org/en/)
* [ExpressJS](https://expressjs.com/)
* [MongoDB](https://www.mongodb.com/cloud/atlas)
* [SocketIO](https://socket.io/)
* [MongooseJS](https://mongoosejs.com/)


<!-- GETTING STARTED -->
## Getting Started

In order to use this API a local mongoDB instance is needed. 

### Prerequisites

* [MongoDB](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/kikooOOoo16/node-socketio-ts-app.git
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Inside the src directory an environment variables file is needed with the following name and structure:

   (`.env-cmdrc` file)
   ```JS
   {
      "development": {
        "NG_APP_URL": "http://localhost:4200",
        "MONGODB_URL": "mongodb://localhost:27017/nodeChatDevDB",
        "JWT_SECRET": "some secret string"
      },
    }
   ```
### Initialisation

1. The server's start script is configured with [ts-node-dev](https://www.npmjs.com/package/ts-node-dev). To start the server just run (or check the other scripts inside package.json) :
   ```sh
   npm run dev
   ```
   
 ### Docker

The API also has a Dockerfile and can be started with Docker. Inside the same directory as the Dockerfile run :
   ```sh
   docker build -t node-socketio-api:1
   docker run -it --name node-socketio-api dockerImageID
   ```
Alternatively the Node API, Angular FE app and MongoDB are configured to be started with Docker Compose. In the same directory as the Docker Compose file run:
   ```sh
  docker-compose up
   ```
   
<!-- CONTACT -->
## Contact

Kristijan Pavlevski - kristijan.pavlevski@outlook.com

Project Link: [https://github.com/kikooOOoo16/node-socketio-ts-app](https://github.com/kikooOOoo16/node-socketio-ts-app)

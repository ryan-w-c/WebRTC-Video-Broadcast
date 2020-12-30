# WebRTC Video/Audio Broadcast

WebRTC PeerToPeer broadcast application that allows the broadcaster to send video and audio stream to all connected users (watchers). 
Added ability to change resolution of stream and prefer a codec, such as VP9.

Inspired and taken from Gabriel Tanner's [repo](https://github.com/TannerGabriel/WebRTC-Video-Broadcast.git) and [tutorial](https://gabrieltanner.org/blog/webrtc-video-broadcast).

Included a [script](https://cdn.webrtc-experiment.com/CodecsHandler.js) to prefer codecs and other useful functions.

## Getting started

### Starting the application

Start the application using Node:

```open terminal

# Install dependencies for server
MacOS (Homebrew needed):
brew update
brew install node

Linux:
sudo apt-get install npm

# Run the server
node server.js
```

Start the application using Docker (Not tested):

```bash
# Building the image
docker build --tag webrtcvideobroadcast .

# Run the image in a container
docker run -d -p 8080:8080 webrtcvideobroadcast
```

### Testing the application

Connect to localhost:8080/broadcast.html to add a new broadcaster.

After that, you just need to visit localhost:8080 or [device_running_server_ip_address]:8080 from another device to connect to the server as a client and you should get the video that is streamed from the broadcaster.

## Adding a TURN server (Not tested)

A TURN server is used to relay traffic if a direct peer to peer connection fails and is required for most WebRTC application since a direct socket is often not possible between two clients that aren't on the same network. This repository doesn't include the usage of a TURN server by default, but you can add one by commenting in the turn configuration in the `broadcast.js` and `watch.js` file and filling in your TURN credentials.

There are several options on how you can create your own TURN server. Here are just two common ones:

- [Coturn](https://github.com/coturn/coturn)
- [Golang WebRTC pion library TURN examples](https://github.com/pion/turn/tree/master/examples)

You can also use TURN servers from cloud providers or other companies.


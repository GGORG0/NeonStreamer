# NeonStreamer

My submission for [Hack Club's Neon YSWS](https://neon.hackclub.dev/)!

[View demo video on YouTube - see it playing Bad Apple](https://youtu.be/oD8XsXTkqtY)

It allows you to stream your screen to the LED matrix via MQTT using a web client (make sure your broker supports WebSockets and you're connecting to it on the correct port from the web app!).

[Open project in Neon Editor](https://neon.hackclub.dev/open?author=GGORG0&repo=NeonStreamer&branch=master)

## Client usage

The client is made using Vite + Vanilla TypeScript.

It is [deployed on GitHub Pages here](https://ggorg0.github.io/NeonStreamer/).

To run it locally, do:

```sh
yarn set version stable # get Yarn v4

cd neon-streamer-client
yarn
yarn dev
```

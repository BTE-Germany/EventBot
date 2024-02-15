# BTE Germany EventBot

# What is this?

This bot is supposed to simplify the submission and judging of buildings built during an Event. It connects Discord and Minecraft accounts for seamless integration. An API is provided to create a leaderboard.

# Quickstart
To get started, run the following commands in  a new folder

```
$ curl -O https://raw.githubusercontent.com/BTE-Germany/EventBot/DiscordJS/docker-compose.yml
$ docker pull ghcr.io/bte-germany/eventbot:latest
$ docker pull postgres:14.1-alpine
$ docker-compose up -d
```

The port 6970 will be exposed for management of the built-in database. If you do not want to use the built-in database or don't want this port to be exposed, please edit the `docker-compose.yml` file accordingly. 
The port 6969 will be exposed for access to the built-in API. If you do not want to use the built-in API or don't want this port to be exposed, please edit the `docker-compose.yml` file accordingly.

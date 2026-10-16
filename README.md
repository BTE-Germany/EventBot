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

# Status page

Every 5 minutes the bot renders a self-contained HTML status page and uploads it to the image storage (`AZURE_STORAGE_CONNECTION_STRING` / `CONTAINER_NAME`, served via `CDN_URL`). It shows:

- Bot health (online, uptime, Discord latency, memory)
- Event numbers: builders, builds by status, longest wait for a judge, points, categories
- Charts: submissions per day (14 days), score distribution, reference types
- Top 10 builders, latest builds, judge activity
- An activity feed (registrations, submissions, judging, corrections, deletions) with every point change, filterable and searchable

The page includes judge names and correction reasons, so by default it is uploaded to an unguessable path (`wichtig/stats-<hash>.html`, stable as long as the bot token stays the same). The full URL is logged on startup. Set `STATS_PAGE_PATH` to choose a different path. Files under `wichtig/` are kept by `/clearimages`.

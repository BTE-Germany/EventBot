# API

This repo uses fastify to provide an easy API interface.

# Endpoints

```
/leaderboard
```

Sample response:

```json
{
  "users": [
    {
      "id": "123456789012345678",
      "banned": false,
      "minecraft_id": "MinecraftPlayer",
      "points": 0
    }
  ],
  "builds": [
    {
      "id": 1,
      "message": "123456789012345670",
      "judge_msg": "123456789012345678",
      "location": "location",
      "A": 0,
      "B": 0,
      "base_points": 0,
      "reference_type": "Streetview",
      "reference_link": "https://maps.google.com/...",
      "builder_id": "123456789012345678",
      "judges": [],
      "images": [
        "https://cdn.com/event/123456789012345678/eff455cd-787d-427f-8eb1-91e8a4ea2c26.jpg"
      ]
    }
  ],
  "points": 10
}
```

# Adding new endpoints

Use this template to create a new endpoint

```javascript
const prisma = require("../../utils/prisma.js");

module.exports = {
  path: "/endpoint",
  method: "GET",
  handler: async (request, reply) => {
    reply.send("success");
  },
};
```

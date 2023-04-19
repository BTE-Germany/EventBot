# Commands
```
/register <minecraft:string>
```
> This command registers a user with their minecraft account. This step is necessary to start building.

```
/judge <id:int> <details:int> <aufwand:int> <grundpunkte:bool>
```
> By default a user is granted 10 points when submitting a building. 
> This command is only available to those with the "PING_ROLE" defined in your .env. Points for "details" and "aufwand" range from 1 to 10. The "grundpunkte" bool can be used to remove the 10 base-points from the user.

```
/delete <id:int> <reason:string>
```
> This command is only available to those with the "PING_ROLE" defined in your .env. As it's name suggests it deletes a build.

```
/createmsg
```
> This command generates a message that can be supplied in your .env as the "LEADERBOARD_MESSAGE".

Use the following template to add custom commands:
```javascript
require('dotenv').config();

module.exports = {
    command: {
        name: "command",
        description: "A command",
        options: [
        {
            name: "param",
            description: "A string parameter",
            type: 3,
            required: true,
        }
        ],
    }, 
    run: async (client, interaction, prisma) => {
        ...    
    }
}
```

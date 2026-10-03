# Commands

```
/register <minecraft:string>
```

> This command registers a user with their minecraft account. This step is necessary to start building.

```
/submit <koordinaten:string> <referenz:string> <link:string> <bild1:attachment> [bild2:attachment] [bild3:attachment]
```

> Reiche einen neuen Build ein. Die Quellenangabe (Referenz: 3D-Ansicht, Streetview, Bilder + gültiger Link) ist verpflichtend.

```
/judge <id:int> [grundpunkte:number] <aufwand_komplexitaet:number> <technik_farben_details:number>
```

> Nur für Nutzer mit der "PING_ROLE". Punktevergabe in 0,5-Schritten (maximal 18 Punkte):
> - `grundpunkte`: 1 für Infrastruktur, 2 für Gebäude (wird **nur vom 1. Judge** festgelegt)
> - `aufwand_komplexitaet`: 0 bis 6 Punkte (wird zwischen beiden Judges gemittelt)
> - `technik_farben_details`: 0 bis 10 Punkte (wird zwischen beiden Judges gemittelt)

```
/correct <id:int> <reason:string> [grundpunkte:number] [aufwand_komplexitaet:number] [technik_farben_details:number]
```

> Ermöglicht es Judges, Bewertungen nachträglich zu korrigieren. Punktdifferenzen werden dem Builder automatisch gutgeschrieben oder abgezogen.

```
/refresh [id:int]
```

> Nur für Nutzer mit der "PING_ROLE". Aktualisiert die Building-Panels eines Builds in #submissions und #judge. Ohne `id` werden die letzten 10 Builds aktualisiert.

```
/stats
```

> Zeigt die aktuellen Event-Statistiken inklusive automatisch generierter Ranglisten-Grafik an.

```
/delete <id:int> <reason:string>
```

> Löscht ein Build und zieht bei bereits bewerteten Builds die vergebenen Punkte ab.

```
/createmsg
```

> Erzeugt eine Platzhalter-Nachricht für die `LEADERBOARD_MESSAGE` in der `.env`.

```
/createstatsmsg
```

> Erzeugt eine Platzhalter-Nachricht für die `STATS_MESSAGE` in der `.env`.

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

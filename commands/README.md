# Commands

## Berechtigungen

Judge- und Admin-Befehle sind in Discord standardmäßig nur für Administratoren sichtbar. Damit Judges ihre Befehle sehen, einmalig unter **Servereinstellungen → Integrationen → Bot** die `PING_ROLE` für `/judge`, `/correct`, `/refresh`, `/delete` und `/unjudged` freischalten. Zusätzlich prüft der Bot selbst die `PING_ROLE` (Judges) bzw. die Administrator-Berechtigung (`/cleardatabase`, `/clearimages`).

## Für alle

```
/register <minecraft:string>
```

> Verknüpft den Discord-Account mit einem Minecraft-Namen. Notwendig, um Builds einzureichen.

```
/submit <koordinaten:string> <referenz:string> <link:string> <bild1:attachment> [bild2:attachment] [bild3:attachment]
```

> Reiche einen neuen Build ein. Die Quellenangabe (Referenz: 3D-Ansicht, Streetview, Bilder + gültiger Link) ist verpflichtend. Alternativ kann eine Nachricht mit Bildern, Koordinaten und Link direkt im Submission-Kanal gepostet werden. Über den Button „Zusätzliche Informationen“ kann der Builder den Judges weitere Hinweise geben.

```
/stats
```

> Zeigt die aktuellen Event-Statistiken inklusive automatisch generierter Ranglisten-Grafik an.

## Für Judges (`PING_ROLE`)

```
/judge <id:int> <aufwand_komplexitaet:number> <technik_farben_details:number> [grundpunkte:number]
```

> Punktevergabe in 0,5-Schritten (maximal 18 Punkte). Das eigene Build kann nicht bewertet werden:
> - `grundpunkte`: 1 für Infrastruktur, 2 für Gebäude (wird **nur vom 1. Judge** festgelegt)
> - `aufwand_komplexitaet`: 0 bis 6 Punkte (wird zwischen beiden Judges gemittelt)
> - `technik_farben_details`: 0 bis 10 Punkte (wird zwischen beiden Judges gemittelt)

```
/correct <id:int> <reason:string> [grundpunkte:number] [aufwand_komplexitaet:number] [technik_farben_details:number]
```

> Korrigiert eine Bewertung nachträglich. Die Punkte des Builders werden automatisch neu berechnet.

```
/refresh [id:int]
```

> Aktualisiert die Building-Panels eines Builds in #submissions und #judge. Ohne `id` werden die letzten 10 Builds aktualisiert.

```
/delete <id:int> <reason:string>
```

> Löscht ein Build samt Nachrichten und Bildern. Die Punkte des Builders werden neu berechnet.

```
/unjudged
```

> Listet alle Builds auf, die noch nicht von zwei Judges bewertet wurden.

## Für Administratoren

```
/cleardatabase <sure:boolean> <reason:string>
```

> Löscht PERMANENT alle Builds und setzt alle Punkte auf 0.

```
/clearimages <sure:boolean> <reason:string>
```

> Löscht PERMANENT alle Bilder im Azure-Speicher (außer im Ordner `wichtig/`).

```
/createmsg
```

> Erzeugt eine Platzhalter-Nachricht für `LEADERBOARD_MESSAGE` / `LEADERBOARD_CHANNEL` in der `.env`.

```
/createstatsmsg
```

> Erzeugt eine Platzhalter-Nachricht für `STATS_MESSAGE` / `STATS_CHANNEL` in der `.env`.

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

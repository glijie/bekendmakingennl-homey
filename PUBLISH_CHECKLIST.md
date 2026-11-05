# Publish checklist – Bekendmakingen NL

Voor iedere publicatie:

- [ ] Versie in `.homeycompose/app.json`, `app.json` en `package.json` is gelijk.
- [ ] `CHANGELOG.md` is bijgewerkt.
- [ ] `.homeychangelog.json` bevat de Store-changelog voor de te publiceren versie.
- [ ] Nederlandse en Engelse README zijn gecontroleerd.
- [ ] App-description is een korte tagline en herhaalt de README niet.
- [ ] App- en drivericonen/afbeeldingen voldoen aan de actuele Athom-richtlijnen.
- [ ] Alle tests slagen.
- [ ] `homey app validate --level publish` slaagt op de ontwikkel-pc.
- [ ] App met `homey app run` of `homey app install` op echte Homey getest.
- [ ] Indien beschikbaar: support-, bugs- en source-URL's in het manifest controleren.

## Gebiedszoeken - test op echte Homey
- Koppel een woonplaats (bijvoorbeeld Rozenburg) via PDOK zoekresultaat en controleer de gekozen grens.
- Controleer in Homey App Instellingen dat alleen aantoonbaar binnen deze woonplaats gelegen bekendmakingen voorkomen; niet alle Rotterdamse publicaties.
- Test daarnaast wijk, buurt en gemeente met echte KOOP-resultaten en de gevallen zonder coördinaten.
- Bij KOOP-resultaten zonder geografische locatie kan de app de publicatie niet altijd aan een woonplaats/wijk/buurt koppelen; dit is een bewuste beperking. Test dat voor live publicatie.
- Draai de officiële Athom `homey app validate --level publish` op een ontwikkel-pc en test de pairing op de echte Homey Pro 2019.

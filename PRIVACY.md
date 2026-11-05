# Privacy – Bekendmakingen NL

Bekendmakingen NL gebruikt geen eigen cloudserver, gebruikersaccount of advertentietracking.

## Welke gegevens worden gebruikt?
- Het door de gebruiker gekozen adres wordt in Homey bij het apparaat opgeslagen.
- Bij het toevoegen of wijzigen van een adres wordt het adres rechtstreeks vanuit de app naar PDOK gestuurd om de locatiecoördinaten te bepalen.
- De gevonden coördinaten en ingestelde straal worden gebruikt voor zoekopdrachten bij KOOP naar officiële bekendmakingen.
- De app bewaart lokaal op Homey welke publicaties al zijn gezien, zodat dezelfde bekendmaking niet telkens opnieuw als nieuw wordt gemeld.
- Voor het overzicht bewaart de app per adres ook maximaal vijf recente publieke bekendmakingen (titel, categorie, datum, instantie, locatie en officiële link). Deze zijn alleen beschikbaar via de afgeschermde lokale Homey-app-API.

## Geen eigen opslag buiten Homey
De ontwikkelaar beheert voor deze app geen eigen server waarop adressen, locaties of zoekgeschiedenis worden opgeslagen. Externe overheidsdiensten kunnen hun eigen technische logbestanden bijhouden volgens hun eigen voorwaarden.

## Onafhankelijke app
Bekendmakingen NL is een onafhankelijke Homey-app en is niet verbonden aan of uitgegeven door KOOP, PDOK, Overheid.nl of een Nederlandse overheidsorganisatie.

---

# Privacy – English

Bekendmakingen NL does not use its own cloud server, user account or advertising tracking. The address selected by the user is stored with the device in Homey. When an address is added or changed, the app sends it directly to PDOK to resolve its coordinates. Those coordinates and the configured radius are then used to query KOOP for official public notices. Seen publication identifiers are stored locally on Homey to prevent duplicate new-notice triggers. For the detailed overview, up to five recent public notices (title, category, date, authority, location and official URL) are stored locally per monitored address, accessible through the authenticated Homey app API. The developer does not operate a separate server that stores addresses, locations or search history. External government services may retain their own technical logs under their own terms. Bekendmakingen NL is an independent Homey app and is not affiliated with or published by KOOP, PDOK, Overheid.nl or any Dutch government organisation.

Bij gebiedszoeken worden gekozen plaats-, wijk-, buurt- of gemeentenamen naar PDOK verstuurd om de gebiedsgrens op te halen. De grens wordt lokaal op Homey opgeslagen; KOOP ontvangt vervolgens de geografische zoekrechthoek.

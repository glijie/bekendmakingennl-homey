# Privacy – Bekendmakingen NL

Bekendmakingen NL is een onafhankelijke Homey-app. De ontwikkelaar gebruikt geen eigen cloudserver, gebruikersaccount of advertentietracking voor deze app.

## Welke gegevens verwerkt de app?

- Bij **adres + straal** bewaart de app het gekozen adres, de gevonden coördinaten, de straal en het controle-interval in Homey. Om het adres op te zoeken wordt een verzoek aan de publieke PDOK Locatieserver verstuurd.
- Bij **stad/dorp, wijk, buurt of gemeente** verstuurt de app de ingevoerde zoeknaam naar PDOK. De geselecteerde gebiedsnaam en bijbehorende geografische gegevens worden in Homey bewaard.
- Voor de controles worden geografische zoekgegevens en, waar van toepassing, naam- of gemeentekenmerken gebruikt in verzoeken aan de publieke KOOP-zoekdienst. Welke velden meegaan hangt af van de zoekmodus.
- De app bewaart op Homey identificaties van eerder verwerkte publicaties om herhaalde meldingen te voorkomen.
- Voor het overzicht bewaart de app **maximaal 50 recente openbare bekendmakingen per bewaakte locatie** (onder meer titel, categorie, publicatiedatum, instantie, locatie en officiële link). In de app-instellingen kun je per locatie kiezen hoeveel daarvan je toont: **1 t/m 50**, standaard **5**. De zoekperiode is momenteel de afgelopen zeven dagen.
- Het overzicht is beschikbaar via de Homey-appinstellingen en de bijbehorende Homey App API.

## Externe diensten en bewaren

De ontwikkelaar exploiteert geen eigen server voor de opslag van adressen, locaties of zoekgeschiedenis. PDOK en KOOP kunnen bij het verwerken van verzoeken eigen technische logbestanden bijhouden volgens hun voorwaarden. Zoekgegevens van een apparaat worden met dat Homey-apparaat opgeslagen. Een voorkeur voor het aantal zichtbare berichten staat in de algemene app-instellingen en kan na het verwijderen van een afzonderlijk apparaat blijven bestaan totdat de app wordt verwijderd.

## Onafhankelijkheid

Bekendmakingen NL is niet verbonden aan of uitgegeven door KOOP, PDOK, Overheid.nl of een Nederlandse overheidsorganisatie. Officiële publicaties zijn afkomstig van externe bronnen; de app kan geen volledige dekking garanderen als de bron onvoldoende locatie-informatie bevat.

---

# Privacy – English

Bekendmakingen NL is an independent Homey app. The developer does not operate a separate cloud server, user account or advertising tracker for this app.

## Data processed

- In **address + radius** mode, the app stores the selected address, resolved coordinates, radius and check interval in Homey. It sends the address to the public PDOK Location Server for lookup.
- In **town/city, district, neighbourhood or municipality** mode, the entered name is sent to PDOK. The selected area's name and geographical data are stored in Homey.
- Checks send geographical search data and, when relevant, place or municipality metadata to the public KOOP search service. The precise parameters depend on the selected search mode.
- Homey stores identifiers of previously processed notices to prevent repeat alerts.
- The app caches **up to 50 recent public notices per monitored location** on Homey (including title, category, publication date, authority, location and official link). In app settings you can choose **1–50** to display for each location, with **5** as the default. The current search window covers the past seven days.
- The overview is accessible through Homey app settings and its Homey App API.

## External services and retention

The developer does not operate a server that collects addresses, locations or search history. PDOK and KOOP may retain technical request logs under their own terms. Search information is stored with each Homey device. Preferences for how many notices to display are stored as global app settings and may remain after a single device is removed, until the app itself is uninstalled.

## Independence

The app is not affiliated with or published by KOOP, PDOK, Overheid.nl or a Dutch government organisation. Complete geographic coverage cannot be guaranteed when original publications lack sufficient location information.

# Publishchecklist – Bekendmakingen NL

## In de ZIP gecontroleerd

- [x] Versie in `.homeycompose/app.json`, `app.json` en `package.json` gelijk: `1.0.0`.
- [x] `CHANGELOG.md` en `.homeychangelog.json` aanwezig (First release).
- [x] `README.txt` en `README.nl.txt` als korte, onopgemaakte Store-teksten (maximaal twee alinea's, zonder URLs).
- [x] Korte NL/EN-description staat los van de README.
- [x] Pairing voor NL/EN vertaald met officiële Homey-i18n-functie.
- [x] App-instellingen in NL/EN nagekeken.
- [x] Privacyinformatie bijgewerkt voor adres- en gebiedszoeken en cache van maximaal 50 publicaties.
- [x] App- en driverbeelden voldoen aan Athom-resoluties. Op verzoek niet aangepast.
- [x] App- en drivericonen aanwezig; geen wijzigingen aan beelden/iconen.
- [x] Alle lokale tests, JSON-, JavaScript- en ZIP-integriteitscontroles afgerond.
- [x] Source- en supportlink verwijzen naar `https://github.com/glijie/bekendmakingennl-homey`.
- [x] Alle zes triggers, één EN-voorwaarde en één DAN-actie hebben `titleFormatted` in NL/EN, inclusief apparaatargument `[[device]]`.
- [x] De gegenereerde `app.json` bevat nu ook de acht Flow-definities, met `driver_id=location` en ongewijzigde kaart-ID’s.
- [x] Automatische regressietests voorkomen dat Compose en het gegenereerde Flow-manifest weer uiteenlopen.
- [x] Overige gebruikersgerichte locatie- en foutmeldingen worden volgens Homey-taal NL/EN weergegeven.

## Nog op een echte Homey / bij Athom uitvoeren

- [ ] `homey app validate --level publish` moet slagen. De officiële Homey CLI is niet beschikbaar in de bouwomgeving.
- [ ] Test het toevoegen van een adres en alle vier gebiedstypen op Homey Pro.
- [ ] Test de Engelse pairing en de Engelse app-instellingen op een Homey met Engelse taal.
- [ ] Controleer enkele echte KOOP-resultaten voor adres, stad/dorp, wijk, buurt en gemeente, inclusief berichten zonder exacte geometrie.
- [ ] Controleer of een nieuwe Flow-trigger de oorspronkelijke publicatielink meestuurt en dubbele meldingen uitblijven.
- [ ] Test app-update op bestaande Homey-apparaten, inclusief bestaande instellingen, opgeslagen monitoren en Flow-kaarten.
- [ ] Controleer de GitHub-repository en supportinformatie op bereikbaarheid.
- [ ] Na succesvolle validatie als Test publiceren en vervolgens bij Athom certificering aanvragen.

**Let op:** correcte afmetingen zijn een harde formaatvoorwaarde, maar Athom beoordeelt afbeeldingen en algemene kwaliteit ook inhoudelijk tijdens review.

Bekendmakingen NL keeps you informed about official Dutch public notices around places that matter to you. Add one or more addresses, choose the distance and let Homey follow the public publication data in the background.

The app uses KOOP for official public notices and PDOK to resolve the selected location. Bekendmakingen NL is an independent Homey app and is not an official government app.

To view full notices: Homey → Apps → Bekendmakingen NL → Settings. Select a monitored address and choose how many notices to display (1–50, default 5), with full titles, dates, authorities and official links. Up to 50 records are cached after the next successful poll, from the same 7-day search window. No Dashboard subscription is required.

Area modes: address/radius, town or city, district, neighbourhood, municipality via PDOK. Area mode uses KOOP geographic bounding boxes and verifies available publication locations; records lacking geographic data may be omitted.


Geographic coverage
-------------------
All official publication categories are searched. Area mode combines KOOP
indexed point locations, derived geographic areas and place-name metadata.
Whole-municipality mode additionally searches the publishing municipality.
Unverified bounding-box hits are labeled 'Possible area match', and documents
covering the whole municipality are labeled 'Municipality-wide'.
Publications without reliable geographic metadata cannot be perfectly assigned
to a town or neighborhood. Result truncation is shown explicitly. An initial
rescan baseline prevents alerts for previously published items after upgrading.
The radius setting applies only to address mode.

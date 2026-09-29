# Vend Value Calculator

Itsenäinen selainpohjainen arvolaskuri Torille, FINNille, Blocketille ja DBA:lle.
Sovellus säilyttää hyväksytyn designin, kielivalinnat, laskennan, kaaviot ja Excel-tuonnin.
Replitin canvasia, taustapalvelinta, tietokantaa tai API-avaimia ei tarvita.

## Käynnistys omalla koneella

Asenna Node.js 22.12 tai uudempi ja avaa terminaali tämän kansion juureen:

```sh
npm install
npm run dev
```

Avaa terminaalin ilmoittama paikallinen osoite selaimessa.
Älä avaa HTML-tiedostoja suoraan `file://`-osoitteella.

## Tuotantoversio

```sh
npm run build
npm run serve
```

Julkaistavat tiedostot syntyvät kansioon `dist/public`.
Voit julkaista tämän kansion tavallisella staattisia sivustoja tarjoavalla palvelulla.
Build-komento on `npm run build` ja julkaisukansio `dist/public`.
Sovelluksen etusivu on `index.html`.

Tekniset regressiotarkistukset voi ajaa komennolla `npm run check`.
Chart.js ja Excel-käsittelykirjasto toimitetaan sovelluksen mukana.
Fontti ladataan Google Fontsista; jos se ei ole saatavilla, selain käyttää
tyylien varafonttia.

Oletuksena sovellus palvellaan sivuston juuresta. Jos julkaiset sen alikansioon,
aseta `BASE_PATH` buildin yhteydessä vastaamaan polkua, esimerkiksi `/vend-calculator/`.
Palvelimen portin voi valita `PORT`-muuttujalla. Kumpikaan muuttuja ei ole pakollinen
paikallisessa käytössä.

## GitHubiin siirtäminen

Tämä kansio (`artifacts/vend-calculator`) on itsenäinen projekti.
Kopioi **sen sisältö** uuden GitHub-repositorion juureen. Mukaan kuuluvat myös
`public` ja muut lähdekoodi-/skriptikansiot, pakettitiedostot, Vite-asetukset ja tämä README.

Älä kopioi `node_modules`, `dist`, `.replit-artifact` tai salaisuuksia sisältäviä tiedostoja.
Mukana oleva `.gitignore` sulkee riippuvuudet, build-tulokset ja `.env`-tiedostot
versionhallinnan ulkopuolelle. `.replit-artifact` sisältää Replitin esikatselun
asetukset; jätä se pois, kun kopioit projektin Replitin ulkopuolelle.
Design-sandboxia ja monorepon muita kansioita ei tarvitse kopioida.

Kun olet kopioinut kansion omalle koneellesi, voit luoda siitä Git-repositorion:

```sh
git init
git add .
git commit -m "Initial Vend calculator app"
git branch -M main
git remote add origin https://github.com/OMISTAJA/REPOSITORIO.git
git push -u origin main
```

Korvaa osoite oman uuden, tyhjän GitHub-repositoriosi osoitteella.
Jos viet koko Replit-projektin GitHubiin, sovellus löytyy edelleen
`artifacts/vend-calculator`-alikansiosta.

## Toiminta ja rajaukset

- Valintasivu avautuu englanniksi. Markkinapaikka avautuu oman maansa kielellä.
- Kieli ei vaihda markkinapaikan hinnoittelua tai laskentamallia.
- Torin suomenkielinen ja muunkielinen laskuri käyttävät erillisiä istuntoja.
- Excel-tiedoston tiedot käsitellään selaimessa, ei sovelluksen palvelimella.
- Laskelmat ovat arvioita, eivät lupauksia tuloksista. Oletuksia voi muuttaa.
- Markkinapaikkojen hinnat ja kaupalliset ehdot on vahvistettava ennen asiakaskäyttöä.
- Blocketin ja DBA:n yhteinen vaikutuskerroin on esimerkkioletus, ei vahvistettu
  markkinakohtainen suorituskykymittaus.

Nykyinen design-esikatselu on jätetty erikseen alkuperäiseen projektiin.
Tämän sovelluksen muutokset eivät automaattisesti muuta design-versiota.
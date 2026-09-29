# Julkaisu repositorioon laurihyoky/arvolaskuri

Tämä on valmis GitHub Pages -julkaisu, ei aiempi Vite-lähdekoodipaketti.
Älä suorita npm-komentoja tätä pakettia varten.

1. Pura ZIP. Siirrettävät tiedostot ovat github-pages-kansiossa.
2. Luo GitHubissa main-haarasta uusi haara, esimerkiksi korjaa-pages.
3. Lisää github-pages-kansion SISÄLTÖ repositorion juureen (ei itse kansiota).
   Korvaa index.html. Siirrä kaikki alikansiot: assets (jos mukana),
   vendor, vend-assets ja .github sekä kaikki mukana olevat HTML/JS/CSS-tiedostot.
   .github on piilotettu kansio joissain tiedostoselaimissa. Tarkista GitHubista,
   että .github/workflows/deploy-pages.yml on mukana.
4. Repositorio → Settings → Pages → Build and deployment → Source: GitHub Actions.
   Tämä vaihtaa julkaisun tähän mukana tulevaan työnkulkuun. Vanha sivu pysyy
   saatavilla, kunnes uusi julkaisu onnistuu.
5. Yhdistä korjaa-pages-haaran pull request main-haaraan.
6. Avaa Actions → Publish calculator to GitHub Pages. Odota vihreää onnistumista.
7. Avaa https://laurihyoky.github.io/arvolaskuri/ ja päivitä sivu ilman välimuistia.

Työnkulun permissions-osio sisältää pages: write ja id-token: write.
Se korjaa tutkitussa julkaisuajossa ilmoitetun puuttuvan id-token-oikeuden.
Organisaation tai repositorion muut rajoitukset voivat silti estää julkaisun;
mahdolliset virheet näkyvät Actions-ajossa.

Tärkeää:
- Pelkkä index.html ei riitä. Kaikkien kansioiden pitää siirtyä mukana.
- Älä lataa ZIP-tiedostoa sellaisenaan GitHubiin.
- Tämä paketti on kohdistettu /arvolaskuri/-osoitteeseen.
- Lähdekoodia muokataan edelleen erillisessä vend-calculator-projektissa.
- Revert palauttaa tiedostot, ei Settings → Pages -asetusta. Jos haluat palata
  vanhaan julkaisutapaan, muuta myös Pagesin Source takaisin aiempaan arvoon.
- Verkossa nähty rikkoutunut versio ei korjaannu pelkällä tämän ZIPin lataamisella
  koneelle: tiedostot on siirrettävä ja Pages-julkaisun on onnistuttava.
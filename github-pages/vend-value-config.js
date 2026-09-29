(function () {
  "use strict";
  const t = {
    fi: { title:"Vend Value Calculator", eyebrow:"Pohjoismaiden myynnin työtila", lead:"Valitse markkinapaikka aloittaaksesi.", choose:"Valitse markkinapaikka", language:"Kieli", available:"Laskuri käytettävissä", waiting:"Hinnoittelua odotetaan", awaitingTitle:"Hinnoittelutietoja valmistellaan", awaiting:"Emme näytä laskuria ennen kuin paikalliset paketit, hinnat ja laskentaperiaatteet on vahvistettu.", unsupportedTitle:"Laskuri on tällä hetkellä saatavilla suomeksi tai englanniksi", unsupported:"Muut kieliversiot odottavat hyväksyttyä käännöstä. Valitse yksi saatavilla olevista laskureista.", back:"Takaisin valintaan", switch:"Vaihda markkinapaikkaa", open:"Avaa laskuri", currency:"Valuutta", local:"Paikallinen kieli", notice:"Vain Tori Suomen hinnoittelu on vahvistettu tässä vaiheessa.", fiChoice:"Suomeksi", enChoice:"Englanniksi", confirm:"Kielenvaihto voi ladata laskurin uudelleen. Jatketaanko?" },
    en: { title:"Vend Value Calculator", eyebrow:"Nordic sales workspace", lead:"Choose a marketplace to get started.", choose:"Choose a marketplace", language:"Language", available:"Calculator available", waiting:"Pricing pending", awaitingTitle:"Local pricing is being prepared", awaiting:"We do not show a calculator until local packages, prices and calculation policy have been confirmed.", unsupportedTitle:"The calculator is currently available in Finnish or English", unsupported:"Other calculator translations await approved content. Choose one of the available calculator languages.", back:"Back to selection", switch:"Switch marketplace", open:"Open calculator", currency:"Currency", local:"Local language", notice:"Only Tori Finland pricing is confirmed in this phase.", fiChoice:"Finnish", enChoice:"English", confirm:"Changing language may reload the calculator. Continue?" },
    nb: { title:"Vend Value Calculator", eyebrow:"Nordisk arbeidsflate for salg", lead:"Velg en markedsplass for å starte.", choose:"Velg markedsplass", language:"Språk", available:"Kalkulator tilgjengelig", waiting:"Priser avventer", awaitingTitle:"Lokale priser er under arbeid", awaiting:"Vi viser ikke en kalkulator før lokale pakker, priser og beregningsregler er bekreftet.", unsupportedTitle:"Kalkulatoren er foreløpig tilgjengelig på finsk eller engelsk", unsupported:"Andre kalkulatoroversettelser venter på godkjent innhold. Velg et tilgjengelig språk.", back:"Tilbake til valget", switch:"Bytt markedsplass", open:"Åpne kalkulator", currency:"Valuta", local:"Lokalt språk", notice:"Bare prisene for Tori Finland er bekreftet i denne fasen.", fiChoice:"Finsk", enChoice:"Engelsk", confirm:"Å bytte språk kan laste inn kalkulatoren på nytt. Fortsette?" },
    sv: { title:"Vend Value Calculator", eyebrow:"Nordisk arbetsyta för säljteam", lead:"Välj en marknadsplats för att börja.", choose:"Välj marknadsplats", language:"Språk", available:"Kalkylator tillgänglig", waiting:"Priser inväntas", awaitingTitle:"Lokala priser förbereds", awaiting:"Vi visar ingen kalkylator innan lokala paket, priser och beräkningsprinciper har bekräftats.", unsupportedTitle:"Kalkylatorn är för närvarande tillgänglig på finska eller engelska", unsupported:"Övriga kalkylatoröversättningar inväntar godkänt innehåll. Välj ett tillgängligt språk.", back:"Tillbaka till valet", switch:"Byt marknadsplats", open:"Öppna kalkylator", currency:"Valuta", local:"Lokalt språk", notice:"Endast priser för Tori Finland är bekräftade i denna fas.", fiChoice:"Finska", enChoice:"Engelska", confirm:"Ett språkbyte kan läsa in kalkylatorn på nytt. Fortsätta?" },
    da: { title:"Vend Value Calculator", eyebrow:"Nordisk arbejdsrum for salg", lead:"Vælg en markedsplads for at komme i gang.", choose:"Vælg markedsplads", language:"Sprog", available:"Beregner tilgængelig", waiting:"Priser afventer", awaitingTitle:"Lokale priser forberedes", awaiting:"Vi viser ikke en beregner, før lokale pakker, priser og beregningsprincipper er bekræftet.", unsupportedTitle:"Beregneren er i øjeblikket tilgængelig på finsk eller engelsk", unsupported:"Andre beregneroversættelser afventer godkendt indhold. Vælg et tilgængeligt sprog.", back:"Tilbage til valg", switch:"Skift markedsplads", open:"Åbn beregner", currency:"Valuta", local:"Lokalt sprog", notice:"Kun priser for Tori Finland er bekræftet i denne fase.", fiChoice:"Finsk", enChoice:"Engelsk", confirm:"Et sprogskift kan genindlæse beregneren. Fortsæt?" }
  };
  t.fi.notice = "Tori-, FINN-, Blocket- ja DBA-laskurit ovat käytettävissä.";
  t.en.notice = "Tori, FINN, Blocket and DBA calculators are available.";
  t.nb.notice = "Kalkulatorene for Tori, FINN, Blocket og DBA er tilgjengelige.";
  t.sv.notice = "Kalkylatorer för Tori, FINN, Blocket och DBA är tillgängliga.";
  t.da.notice = "Beregnere for Tori, FINN, Blocket og DBA er tilgængelige.";
  window.VendValue = {
    languages: [{id:"fi", label:"Suomi"}, {id:"nb", label:"Norsk"}, {id:"sv", label:"Svenska"}, {id:"da", label:"Dansk"}, {id:"en", label:"English"}],
    brands: {
      tori: { name:"Tori Finland", wordmark:"tori", country:"Finland", currency:"EUR", locale:"fi", status:"ready", calculator:{ packages:[
        {name:"Starter",price:99,stars:5},{name:"Standard",price:129,stars:10},{name:"Advanced",price:179,stars:20},{name:"Plus",price:279,stars:50},{name:"Premium",price:489,stars:100},
        {name:"Starter Feed",price:299,stars:100},{name:"Standard Feed",price:599,stars:300},{name:"Advanced Feed",price:899,stars:600},{name:"Plus Feed",price:1299,stars:1000},{name:"Premium Feed",price:1999,stars:2000}
      ], policy:"existing-tori-v19"} },
      finn: { name:"FINN Norway", wordmark:"FINN", country:"Norway", currency:"NOK", locale:"nb", status:"catalog", calculator:null,
        catalog: {
          vatIncluded:false,
          connectNoticeMonths:1,
          connect:[
            {name:"1",minActiveAds:0,maxActiveAds:100,starredAdCapacity:100,price:7999},
            {name:"2",minActiveAds:101,maxActiveAds:300,starredAdCapacity:300,price:17999},
            {name:"3",minActiveAds:301,maxActiveAds:600,starredAdCapacity:600,price:25999},
            {name:"4",minActiveAds:601,maxActiveAds:1000,starredAdCapacity:1000,price:34999},
            {name:"5",minActiveAds:1001,maxActiveAds:2000,starredAdCapacity:2000,price:59999}
          ],
          manual:[
            {name:"Entry",priorityAds:5,price:899},
            {name:"Start",priorityAds:10,price:1499},
            {name:"Grow",priorityAds:20,price:2699},
            {name:"Scale",priorityAds:35,price:4299},
            {name:"Thrive",priorityAds:50,price:5299}
          ]
        } },
      blocket: { name:"Blocket Sweden", wordmark:"blocket", country:"Sweden", currency:"SEK", locale:"sv", status:"catalog", calculator:null,
        catalog: {
          connect:[
            {name:"Starter",maxActiveAds:100,prioritizedAdCapacity:100,price:7999,listedPricePerAd:80},
            {name:"Standard",maxActiveAds:300,prioritizedAdCapacity:300,price:22999,listedPricePerAd:77},
            {name:"Plus",maxActiveAds:600,prioritizedAdCapacity:600,price:44999,listedPricePerAd:75},
            {name:"Premium",maxActiveAds:1000,prioritizedAdCapacity:1000,price:69999,listedPricePerAd:70},
            {name:"Ultimate",maxActiveAds:2000,prioritizedAdCapacity:2000,price:129999,listedPricePerAd:65}
          ],
          manual:[
            {name:"Starter",priorityAds:10,price:1599},
            {name:"Standard",priorityAds:20,price:1999},
            {name:"Plus",priorityAds:50,price:3599},
            {name:"Premium",priorityAds:100,price:5999}
          ]
        } },
      dba: { name:"DBA Denmark", wordmark:"DBA", country:"Denmark", currency:"DKK", locale:"da", status:"catalog", calculator:null,
        catalog: {
          vatIncluded:false,
          manualTrialDays:30,
          manual:[
            {name:"Standard",priorityAds:10,price:599},
            {name:"Advanced",priorityAds:20,price:899},
            {name:"Plus",priorityAds:50,price:1499},
            {name:"Premium",priorityAds:100,price:2499},
            {name:"Ultimate",priorityAds:200,price:3499}
          ],
          connect:[
            {name:"1",maxActiveAds:100,featuredAdCapacity:100,price:1499},
            {name:"2",maxActiveAds:300,featuredAdCapacity:300,price:2149},
            {name:"3",maxActiveAds:600,featuredAdCapacity:600,price:2799},
            {name:"4",maxActiveAds:1000,featuredAdCapacity:1000,price:4399},
            {name:"5",maxActiveAds:2000,featuredAdCapacity:2000,price:7999}
          ]
        } }
    },
    copy: (lang) => t[lang] || t.en
  };
}());
(function () {
  "use strict";
  const V = window.VendValue, shell = document.getElementById("vend-shell"), calculatorNav = document.getElementById("vend-calculator-nav");
  let language = "en", brand = null, englishFrame = null;
  const marketFrames = {};
  const esc = (v) => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const copy = () => V.copy(language);
  const calculatorName = () => ({fi:"Arvolaskuri",nb:"Verdikalkulator",sv:"Värdekalkylator",da:"Værdiberegner",en:"Value Calculator"})[language];
  function decorate() {
    shell.querySelectorAll(".vend-word").forEach(node => {
      const id = node.closest("[data-brand]")?.dataset.brand || brand;
      if (!V.brands[id]) return;
      const image = document.createElement("img");
      image.className = "vend-logo";
      image.src = `vend-assets/${id}.png`;
      image.alt = V.brands[id].wordmark;
      node.replaceWith(image);
    });
    const footer = shell.querySelector(".vend-foot");
    if (footer) footer.textContent = `Vend Value Calculator · ${copy().language}: ${V.languages.find(x => x.id === language).label}`;
  }
  const langSelect = () => `<select class="vend-lang" aria-label="${esc(copy().language)}" onchange="VendShell.setLanguage(this.value)">${V.languages.map(x=>`<option value="${x.id}" ${x.id===language?"selected":""}>${x.label}</option>`).join("")}</select>`;
  const masthead = () => `<header class="vend-top"><div class="vend-brand"><span>${calculatorName()}</span></div>${langSelect()}</header>`;
  function home() {
    brand = null; document.documentElement.lang = language; document.body.classList.add("vend-entry-mode"); document.body.classList.remove("vend-calculator-active"); shell.style.display = "block"; hideEnglish();
    const c=copy();
    shell.innerHTML=`${masthead()}<main class="vend-main"><h1 class="vend-title" aria-label="Vend Value Calculator"><img class="vend-title-logo" src="vend-assets/vend.png" alt=""><span class="vend-title-text">${calculatorName()}</span></h1><p class="vend-lead">${c.lead}</p><div class="vend-section-head"><h2>${c.choose}</h2><span class="vend-section-rule" aria-hidden="true"></span></div><section class="vend-grid" aria-label="${esc(c.choose)}">${Object.entries(V.brands).map(([id,b],index)=>`<button type="button" class="vend-choice" data-brand="${id}" aria-label="${esc(c.open)}: ${esc(b.name)}" onclick="VendShell.choose('${id}')"><span class="vend-choice-art"><img class="vend-choice-image" src="vend-assets/${id}.png" alt=""><span class="vend-choice-number" aria-hidden="true">0${index+1}</span></span><span class="vend-choice-info"><span class="vend-choice-place"><span class="vend-choice-country">${esc(b.country)}</span><span class="vend-choice-currency">${esc(b.currency)}</span></span><span class="vend-choice-arrow" aria-hidden="true">↗</span></span></button>`).join("")}</section><footer class="vend-foot">Vend Value Calculator · ${c.local}: ${V.languages.find(x => x.id === language).label}</footer></main>`;
  }
  function pending() {
    document.documentElement.lang = language; document.body.classList.add("vend-entry-mode"); shell.style.display="block"; hideEnglish();
    const b=V.brands[brand],c=copy();
    shell.innerHTML=`${masthead()}<main class="vend-pending"><div class="vend-word">${b.wordmark}</div><div class="vend-eyebrow">${b.name}</div><h2>${c.awaitingTitle}</h2><p>${c.awaiting}</p><div class="vend-meta"><span>${c.currency}: ${b.currency}</span><span>${c.waiting}</span></div><div class="vend-actions"><button class="vend-btn secondary" onclick="VendShell.back()">${c.back}</button><button class="vend-btn" onclick="VendShell.back()">${c.switch}</button></div></main>`;
  }
  function availability() {
    document.documentElement.lang = language; document.body.classList.add("vend-entry-mode"); shell.style.display="block"; hideEnglish();
    const c=copy();
    shell.innerHTML=`${masthead()}<main class="vend-pending"><div class="vend-word">tori</div><div class="vend-eyebrow">Tori Finland</div><h2>${c.unsupportedTitle}</h2><p>${c.unsupported}</p><div class="vend-actions"><button class="vend-btn secondary" onclick="VendShell.openCalculator('fi')">${c.fiChoice}</button><button class="vend-btn" onclick="VendShell.openCalculator('en')">${c.enChoice}</button><button class="vend-btn secondary" onclick="VendShell.back()">${c.back}</button></div></main>`;
  }
  function sessionNotice() {
    calculatorNav.innerHTML = `<button class="vend-nav-back" type="button" onclick="VendShell.back()">← ${esc(copy().back)}</button><span class="vend-nav-brand">${esc(V.brands[brand].wordmark)}</span>${langSelect()}`;
    calculatorNav.title = brand === "tori" && language === "fi"
      ? "Suomen- ja muunkielisessä laskurissa on erilliset syötteet ja ladatut tiedostot."
      : "";
  }
  function syncFrameLanguage(frame) {
    frame.contentWindow?.postMessage({type:"vend:set-language", language}, window.location.origin);
  }
  function showMarket(id) {
    document.body.classList.remove("vend-entry-mode");
    document.body.classList.add("vend-calculator-active");
    shell.style.display="none"; hideEnglish(); document.documentElement.lang=language; sessionNotice();
    if (!marketFrames[id]) {
      const frame=document.createElement("iframe"); frame.className="vend-calculator-frame";
      frame.title=`${V.brands[id].name} ${copy().title}`; frame.src=`arvolaskuri-en.html?market=${id}&lang=${language}`;
      frame.addEventListener("load", () => syncFrameLanguage(frame));
      document.body.appendChild(frame); marketFrames[id]=frame;
    } else { marketFrames[id].style.display="block"; syncFrameLanguage(marketFrames[id]); }
  }
  function showFinnish() {
    shell.style.display="none"; hideEnglish(); document.body.classList.remove("vend-entry-mode"); document.body.classList.add("vend-calculator-active"); document.documentElement.lang="fi"; sessionNotice();
  }
  function showEnglish() {
    document.body.classList.remove("vend-entry-mode"); document.body.classList.add("vend-calculator-active"); shell.style.display="none"; document.documentElement.lang=language; sessionNotice();
    if (!englishFrame) {
      englishFrame=document.createElement("iframe"); englishFrame.className="vend-calculator-frame"; englishFrame.title="Tori Finland Value Calculator"; englishFrame.src=`arvolaskuri-en.html?lang=${language}`;
      englishFrame.addEventListener("load", () => syncFrameLanguage(englishFrame));
      document.body.appendChild(englishFrame);
    } else { englishFrame.style.display="block"; syncFrameLanguage(englishFrame); }
  }
  function hideEnglish(){ if(englishFrame) englishFrame.style.display="none"; Object.values(marketFrames).forEach(frame=>frame.style.display="none"); }
  function choose(id, preserveLanguage=false) {
    brand=id; if(!preserveLanguage) language=V.brands[id].locale;
    if(V.brands[id].status==="catalog") return showMarket(id);
    if(V.brands[id].status==="pending") return pending();
    if(language==="fi") return showFinnish();
    showEnglish();
  }
  function setLanguage(next) {
    language=next; document.documentElement.lang=language;
    if(brand && V.brands[brand].status==="catalog") return showMarket(brand);
    if(brand && V.brands[brand].status==="pending") return pending();
    if(brand==="tori") return choose("tori", true);
    home();
  }
  window.VendShell={choose,setLanguage,back:home,open:home,openCalculator:(lang)=>{language=lang;choose("tori",true);}};
  if (!V || Object.values(V.brands).filter(b=>b.status==="ready").length!==1 || V.brands.tori.calculator.packages.length!==10) { console.error("Vend Value configuration regression"); return; }
  new MutationObserver(() => {
    if (shell.querySelector(".vend-word")) decorate();
  }).observe(shell, {childList:true, subtree:true});
  const initialBrand = new URLSearchParams(window.location.search).get("brand");
  if (initialBrand && V.brands[initialBrand]) choose(initialBrand);
  else home();
}());
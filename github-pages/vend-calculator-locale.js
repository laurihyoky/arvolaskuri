(function () {
  "use strict";

  const supported = new Set(["fi", "nb", "sv", "da", "en"]);
  const monthNames = {
    fi: ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"],
    nb: ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"],
    sv: ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"],
    da: ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"]
  };
  const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const nodeSources = new WeakMap();
  const attributeSources = new WeakMap();
  let language = "en";
  let observer;
  let pending = false;

  function dictionary() {
    return window.VendCalcTranslations?.[language] || {};
  }
  function translate(value) {
    if (typeof value !== "string" || language === "en" || !value.trim()) return value;
    const dict = dictionary();
    const trimmed = value.trim();
    const whitespace = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const currency = trimmed.match(/\b(NOK|SEK|DKK|EUR)\b/);
    const key = currency ? trimmed.replaceAll(currency[1], "€") : trimmed;
    let result = dict[trimmed] || dict[key];
    if (result && currency && !dict[trimmed]) result = result.replaceAll("€", currency[1]);
    if (!result) {
      result = trimmed;
      result = result.replace(/(\d+)-month avg\./g, (_, months) => `${months} ${dict["month average"] || "month average"}`);
      englishMonths.forEach((month, index) => {
        result = result.replace(new RegExp(`\\b${month}\\b`, "g"), monthNames[language]?.[index] || month);
      });
      const phrases = Object.entries(dict)
        .filter(([english]) => (english.length >= 4 || ["ad", "ads", "new"].includes(english)) && /[a-zA-Z]/.test(english))
        .sort((a, b) => b[0].length - a[0].length);
      for (const [english, localized] of phrases) {
        if (!result.includes(english)) continue;
        const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        result = result.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "gu"), localized);
      }
    }
    return whitespace[1] + result + whitespace[3];
  }
  function translateResult(value) {
    if (typeof value === "string") return translate(value);
    if (Array.isArray(value)) return value.map(translateResult);
    return value;
  }
  function translateNode(node) {
    if (!node.parentElement || node.parentElement.closest("script,style")) return;
    const current = node.nodeValue;
    let state = nodeSources.get(node);
    if (!state || current !== state.output) state = { source: current };
    const output = translate(state.source);
    state.output = output;
    nodeSources.set(node, state);
    if (current !== output) node.nodeValue = output;
  }
  function translateAttribute(element, attr) {
    if (!element.hasAttribute(attr)) return;
    const current = element.getAttribute(attr);
    let states = attributeSources.get(element);
    if (!states) { states = {}; attributeSources.set(element, states); }
    let state = states[attr];
    if (!state || current !== state.output) state = { source: current };
    const output = translate(state.source);
    state.output = output;
    states[attr] = state;
    if (current !== output) element.setAttribute(attr, output);
  }
  function localizeDocument() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode);
    document.querySelectorAll("[title],[aria-label],[placeholder]").forEach(element => {
      ["title", "aria-label", "placeholder"].forEach(attr => translateAttribute(element, attr));
    });
  }
  function scheduleLocalization() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; localizeDocument(); });
  }
  function localizeChartConfig(config) {
    if (!config?.data) return config;
    if (Array.isArray(config.data.labels)) config.data.labels = config.data.labels.map(translateResult);
    config.data.datasets?.forEach(dataset => {
      if (typeof dataset.label === "string") dataset.label = translate(dataset.label);
    });
    function localizeOptions(object) {
      if (!object || typeof object !== "object") return;
      Object.entries(object).forEach(([key, value]) => {
        if (typeof value === "function" && ["label", "title", "footer", "callback", "beforeLabel", "afterLabel"].includes(key)) {
          object[key] = function (...args) { return translateResult(value.apply(this, args)); };
        } else if (typeof value === "string" && ["text", "label"].includes(key)) {
          object[key] = translate(value);
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          localizeOptions(value);
        }
      });
    }
    localizeOptions(config.options);
    return config;
  }
  function formatCpcEfficiency(brand, factor) {
    const template = dictionary()["%brand% is %factor%× cheaper than other media"]
      || "%brand% is %factor%× cheaper than other media";
    return template.replace("%brand%", brand).replace("%factor%", String(factor));
  }
  function setLanguage(next) {
    if (!supported.has(next)) next = "en";
    const changed = language !== next;
    language = next;
    document.documentElement.lang = next;
    document.title = `${new URLSearchParams(location.search).get("market") || "Tori"} ${translate("Value calculator")}`;
    if (changed) window.VendCalculatorLocale.onChange?.();
    localizeDocument();
  }
  function initialize(initial) {
    language = supported.has(initial) ? initial : "en";
    document.documentElement.lang = language;
    document.title = `${new URLSearchParams(location.search).get("market") || "Tori"} ${translate("Value calculator")}`;
    localizeDocument();
    if (!observer) {
      observer = new MutationObserver(scheduleLocalization);
      observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["title","aria-label","placeholder"] });
    }
    window.addEventListener("message", event => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "vend:set-language") return;
      setLanguage(event.data.language);
    });
  }
  window.VendCalculatorLocale = { initialize, setLanguage, translate, localizeChartConfig, formatCpcEfficiency, onChange:null };
}());
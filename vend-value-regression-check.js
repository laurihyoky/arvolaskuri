/* Run with: node public/vend-value-regression-check.js */
import fs from "node:fs";
import vm from "node:vm";
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("./vend-value-config.js", import.meta.url), "utf8"), context);
const value = context.window.VendValue;
const requiredLanguages = ["fi", "nb", "sv", "da", "en"];
const requiredBrands = { tori:"EUR", finn:"NOK", blocket:"SEK", dba:"DKK" };
if (!requiredLanguages.every((key) => value.copy(key).title)) throw new Error("Missing shell translation");
for (const [key, currency] of Object.entries(requiredBrands)) {
  if (!value.brands[key] || value.brands[key].currency !== currency) throw new Error(`Invalid brand config: ${key}`);
}
if (value.brands.tori.status !== "ready" || value.brands.tori.calculator.packages.length !== 10) throw new Error("Tori package regression");
const finn = value.brands.finn;
if (finn.status !== "catalog" || finn.calculator !== null || finn.catalog.connect.length !== 5 || finn.catalog.manual.length !== 5) throw new Error("FINN catalog regression");
const connect = [[100,7999],[300,17999],[600,25999],[1000,34999],[2000,59999]];
const manual = [[5,899],[10,1499],[20,2699],[35,4299],[50,5299]];
if (finn.catalog.connect.some((p,i)=>p.maxActiveAds!==connect[i][0]||p.starredAdCapacity!==p.maxActiveAds||p.price!==connect[i][1]) ||
    finn.catalog.manual.some((p,i)=>p.priorityAds!==manual[i][0]||p.price!==manual[i][1]) ||
    finn.catalog.vatIncluded !== false || finn.catalog.connectNoticeMonths !== 1) throw new Error("FINN prices or terms regression");
const blocket = value.brands.blocket;
if (blocket.status !== "catalog" || blocket.calculator !== null || blocket.catalog.manual.length !== 4 || blocket.catalog.connect.length !== 5) throw new Error("Blocket catalog regression");
const blocketManual = [["Starter",10,1599],["Standard",20,1999],["Plus",50,3599],["Premium",100,5999]];
const blocketConnect = [["Starter",100,7999,80],["Standard",300,22999,77],["Plus",600,44999,75],["Premium",1000,69999,70],["Ultimate",2000,129999,65]];
if (blocket.catalog.manual.some((p,i)=>p.name!==blocketManual[i][0]||p.priorityAds!==blocketManual[i][1]||p.price!==blocketManual[i][2]) ||
    blocket.catalog.connect.some((p,i)=>p.name!==blocketConnect[i][0]||p.maxActiveAds!==blocketConnect[i][1]||p.prioritizedAdCapacity!==p.maxActiveAds||p.price!==blocketConnect[i][2]||p.listedPricePerAd!==blocketConnect[i][3]||"minActiveAds" in p)) throw new Error("Blocket prices, caps or unverified minimums regression");
const dba = value.brands.dba;
if (dba.status !== "catalog" || dba.calculator !== null || dba.catalog.vatIncluded !== false || dba.catalog.manualTrialDays !== 30 ||
    dba.catalog.manual.length !== 5 || dba.catalog.connect.length !== 5) throw new Error("DBA catalog regression");
const dbaManual = [["Standard",10,599],["Advanced",20,899],["Plus",50,1499],["Premium",100,2499],["Ultimate",200,3499]];
const dbaConnect = [["1",100,1499],["2",300,2149],["3",600,2799],["4",1000,4399],["5",2000,7999]];
if (dba.catalog.manual.some((p,i)=>p.name!==dbaManual[i][0]||p.priorityAds!==dbaManual[i][1]||p.price!==dbaManual[i][2]) ||
    dba.catalog.connect.some((p,i)=>p.name!==dbaConnect[i][0]||p.maxActiveAds!==dbaConnect[i][1]||p.featuredAdCapacity!==p.maxActiveAds||p.price!==dbaConnect[i][2]||"minActiveAds" in p)) throw new Error("DBA prices, caps or unverified minimums regression");
console.log("Vend Value configuration checks passed.");
/* Formular für Kündigung und Widerruf. Die Adresse trägt werkzeug/legal.py ein. */
const API = "";
const POSTFACH = "hallo@werbungohneblabla.de";
const form = document.getElementById("vertragsform");
const fehler = document.getElementById("fehler");
const beleg = document.getElementById("beleg");
const ausweich = document.getElementById("ausweich");
const ART = form.dataset.art;

/* Felder nur zeigen, wenn sie gebraucht werden */
function umschalten() {
  const grund = document.getElementById("grund-feld");
  const datum = document.getElementById("datum-feld");
  if (grund) grund.hidden = form.elements.kuendigungsart.value !== "Außerordentliche Kündigung";
  if (datum) datum.hidden = form.elements.endet.value !== "datum";
}
form.addEventListener("change", umschalten);

function lesen() {
  const d = Object.fromEntries(new FormData(form));
  Object.keys(d).forEach((k) => { d[k] = String(d[k]).trim(); });
  d.art = ART;
  if (d.endet === "datum") d.endet = d.enddatum ? "Zum " + d.enddatum.split("-").reverse().join(".") : "";
  delete d.enddatum;
  if (d.kuendigungsart !== "Außerordentliche Kündigung") delete d.grund;
  return d;
}

function pruefen(d) {
  if (!d.name) return "Bitte gib deinen Namen an.";
  if (!d.vertrag) return "Bitte gib an, um welchen Vertrag es geht.";
  if (d.kuendigungsart === "Außerordentliche Kündigung" && !d.grund) return "Bitte gib den Grund für die außerordentliche Kündigung an.";
  if ("endet" in d && !d.endet) return "Bitte wähle ein Datum aus.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return "Bitte gib eine gültige E-Mail-Adresse an.";
  return "";
}

const NAMEN = { kuendigungsart: "Art der Kündigung", grund: "Grund", name: "Name", betrieb: "Betrieb", vertrag: "Vertrag", endet: "Vertragsende", email: "E-Mail für die Bestätigung" };
function zeilen(d) {
  return Object.keys(NAMEN).filter((k) => d[k]).map((k) => [NAMEN[k], d[k]]);
}

/* Beleg zum Speichern oder Drucken, nur mit textContent gefüllt */
function belegZeigen(d, eingang) {
  beleg.replaceChildren();
  const h = document.createElement("h2");
  h.textContent = ART + " eingegangen";
  h.style.marginTop = "0";
  const p = document.createElement("p");
  p.textContent = "Abgegeben über die Schaltfläche auf werbungohneblabla.de am " + eingang + ". Die Bestätigung geht an " + d.email + ".";
  const dl = document.createElement("dl");
  zeilen(d).forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    dl.append(dt, dd);
  });
  const b = document.createElement("button");
  b.type = "button"; b.className = "knopf"; b.textContent = "Beleg speichern oder drucken";
  b.onclick = () => window.print();
  beleg.append(h, p, dl, b);
  beleg.hidden = false;
  form.hidden = true;
  beleg.scrollIntoView({ block: "start" });
}

/* Ohne Backend oder bei einer Störung: fertige E-Mail als Ausweg */
function mailLink(d) {
  const text = zeilen(d).map(([k, v]) => k + ": " + v).join("\n");
  return "mailto:" + POSTFACH + "?subject=" + encodeURIComponent(ART) + "&body=" + encodeURIComponent(ART + "\n\n" + text);
}
function ausweichZeigen(d, satz) {
  ausweich.replaceChildren();
  const a = document.createElement("a");
  a.href = mailLink(d);
  a.textContent = "E-Mail an " + POSTFACH + " öffnen";
  ausweich.append(satz + " ", a);
  ausweich.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = lesen();
  const f = pruefen(d);
  fehler.hidden = !f;
  fehler.textContent = f;
  if (f) return;
  if (d.website) return;
  delete d.website;

  if (!API) {
    ausweichZeigen(d, "Die Erklärung ist noch nicht abgegeben. Bitte sende uns diese vorausgefüllte E-Mail:");
    location.href = mailLink(d);
    return;
  }
  const knopf = form.querySelector("button[type=submit]");
  knopf.disabled = true;
  try {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(d) });
    const a = await r.json();
    if (!a.ok) throw new Error(a.error || "Fehler");
    belegZeigen(d, a.eingang);
  } catch (err) {
    knopf.disabled = false;
    ausweichZeigen(d, "Das Senden hat nicht geklappt, deine Erklärung ist nicht bei uns angekommen. Bitte sende sie per E-Mail:");
  }
});
umschalten();

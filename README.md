# Fondamento · Tarot

Ricostruzione in HTML/CSS/JS dell'animazione Figma "iPhone 16 - 1" (`Tarot.fig`).
Nessuna dipendenza, nessun build: sono file statici.

## Pubblicare su GitHub Pages
1. Crea un repository e carica il **contenuto** di questa cartella nella root (`index.html` deve stare in cima).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. Dopo circa un minuto il sito è su `https://<utente>.github.io/<repo>/`.

Per provarlo in locale basta aprire `index.html` (oppure `python3 -m http.server`).

## Come è fatta
- `data.js`: keyframe, easing e matrici letti direttamente dal file Figma (tempi in secondi).
- `app.js`: motore della timeline (cubic-bezier, tracce per proprietà) e interazione.
- `assets/`: ruota in SVG (path vettoriali originali), carte in WebP.
- Il click sulla ruota o sul ventaglio avvia la timeline di 15 s, come nel prototipo Figma.

## Se qualcosa non combacia con Figma (costanti in `app.js`)
- `TIME_SCALE`: velocità complessiva (Figma salva i tempi in mezzi-microsecondi, quindi `data.js` li ha già dimezzati).
- `PERSPECTIVE`: profondità del flip 3D della carta.
- `ROT_SIGN`: verso di rotazione della ruota (-1 antiorario, 1 orario).
# tarot-site

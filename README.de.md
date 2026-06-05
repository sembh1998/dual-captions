# Dual Captions for Streaming

Sprache: [English](README.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | Deutsch

Dieser Fork ist eine Chrome-Erweiterung mit Manifest V3 ohne Build-Schritt. Sie zeigt doppelte übersetzte Untertitel auf Disney+ und Netflix.

Die aktive Erweiterung liegt in `extension/`. Lade diesen Ordner direkt in Chrome. Dieser Fork nutzt nicht den archivierten Build-Ablauf des ursprünglichen Projekts.

## Was Die Erweiterung Macht

- Zeigt zwei übersetzte Untertitelzeilen gleichzeitig.
- Verwendet standardmäßig Deutsch und brasilianisches Portugiesisch als Ausgaben.
- Nutzt die integrierte Chrome-Übersetzung, wenn die experimentelle Translator API verfügbar ist.
- Unterstützt Disney+ durch das Erfassen von WebVTT-Untertitelsegmenten aus Netzwerk-Anfragen.
- Unterstützt Netflix durch das Lesen des sichtbaren nativen Netflix-Untertiteltexts.
- Blendet die native Netflix-Untertitelebene visuell aus, lässt sie aber als Quelltext aktiviert.
- Hält das übersetzte Overlay im Vollbild sichtbar.
- Ermöglicht das Verschieben des Overlays sowie Anpassungen von Textgröße, Textfarbe, Hintergrundfarbe und Deckkraft.

## Installation

1. Öffne `chrome://extensions` in Chrome.
2. Aktiviere den `Entwicklermodus`.
3. Klicke auf `Entpackte Erweiterung laden`.
4. Wähle den Ordner `extension/` aus diesem Repository aus.
5. Öffne Disney+ oder Netflix und starte ein Video.

Detailliertere Hinweise zur Chrome-AI-Einrichtung stehen in [`extension/README.md`](extension/README.md).

## Chrome-AI-Übersetzung Aktivieren

![Chrome Prompt API Flags aktiviert](extension/screenshots/chrome%20prompt%20api%20enable.png)

1. Öffne `chrome://flags`.
2. Setze `Prompt API for Gemini Nano` auf `Enabled Multilingual`.
3. Setze `Prompt API for Gemini Nano with Multimodal Input` auf `Enabled`.
4. Wenn du `Translation API streaming split by sentence` siehst, lasse es auf `Default`; es ist verwandt, aber nicht der erforderliche Schalter.
5. Starte Chrome neu, lade die entpackte Erweiterung erneut und aktualisiere Disney+ oder Netflix.

## Netflix-Anleitung

1. Starte ein Netflix-Video.
2. Öffne das Netflix-Untertitelmenü.
3. Wähle `English` als Untertitel. Wähle nicht `None`.
4. Die Erweiterung liest diesen englischen Text, blendet die nativen Netflix-Untertitel aus und zeigt das übersetzte Overlay.

### Schritt 1: Englische Untertitel Auf Netflix Auswählen

![Englische Untertitel auf Netflix auswählen](extension/screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Schritt 2: Das Übersetzte Overlay Nutzen

![Übersetztes Overlay funktioniert auf Netflix](extension/screenshots/netflix%20working%20well.png)

## Disney+-Anleitung

1. Starte ein Disney+-Video.
2. Aktiviere die Quelluntertitel, vorzugsweise Englisch.
3. Wenn die Untertitel wegen einer werbefinanzierten Zeitleiste nicht synchron sind, gib die sichtbare Serienzeit in das Sync-Feld ein.
4. Klicke auf `Sync`.

### Disney+-Overlay Funktioniert

![Übersetztes Overlay funktioniert auf Disney+](extension/screenshots/disney%20working%20well.png)

### Wenn Disney+-Untertitel Nicht Synchron Sind

![Disney+-Untertitel nicht synchron](extension/screenshots/disney%20out%20of%20sync.png)

### Nach Manueller Synchronisierung

![Manuelle Disney+-Synchronisierung korrigiert](extension/screenshots/disney%20sync.png)

## Aktuelle Einschränkungen

- Native Netflix-Untertitel müssen aktiviert bleiben, weil Netzwerk-Untertitelparsing für Netflix noch nicht implementiert ist.
- Bildbasierte Netflix-Untertitelebenen sind in diesem MVP nicht lesbar.
- Die integrierte Chrome-Übersetzung hängt von experimentellen Browser-APIs und der lokalen Modellverfügbarkeit ab.
- Disney+ kann Untertitel-Hosts oder -Formate ändern, was Parser-Updates erfordern kann.
- Das alte Build-System und die Legacy-Verzeichnisse stammen aus dem ursprünglichen Projekt und sind nicht der aktive Erweiterungspfad dieses Forks.

## Projektstruktur

- `extension/`: aktive MV3-Erweiterung.
- `extension/src/content.js`: Overlay, Einstellungen, Quellerkennung, Sync und Übersetzungskoordination.
- `extension/src/background.js`: Disney+-Request-Erfassung und Laden von Untertitelsegmenten.
- `extension/src/page-translation-bridge.js`: Main-World-Bridge zu den integrierten Chrome-AI-APIs.
- `extension/src/disneyplus/`: WebVTT-Parser und Untertitelspeicher.
- `extension/screenshots/`: Screenshots für das README.

## Attribution

Dieses Repository ist ein Fork des ursprünglichen Projekts `dual-captions` von Mike Steele. Das ursprüngliche Projekt wurde 2022 upstream archiviert; dieser Fork konzentriert sich auf einen separaten MV3-Workflow für Disney+ und Netflix.

## Lizenz

MIT

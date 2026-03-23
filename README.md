# progetto-olymp-id
					                                                                  OLYMP-ID
Progetto OLYMP-ID: Sistema Integrato di Monitoraggio e Cronometria Digitale per Villaggi Olimpici
1. Panoramica del Sistema
Il progetto OLYMP-ID si pone l’obiettivo di implementare un’infrastruttura tecnologica avanzata basata su tecnologia RFID (Radio Frequency Identification) all’interno del contesto dei Villaggi Olimpici per Ventimiglia 2030. Il sistema è progettato per automatizzare due processi critici: la sicurezza degli accessi alle strutture ricettive e la gestione cronometrica delle competizioni atletiche. Attraverso l'integrazione di sensori distribuiti e dispositivi wearable, OLYMP-ID garantisce l’integrità dei dati, la rapidità dei flussi e la precisione assoluta nelle rilevazioni.


2. Funzionalità Principali
2.1 Controllo Accessi e Gestione Hospitality
Il sistema regola in tempo reale il flusso degli atleti e del personale autorizzato all’interno delle strutture alberghiere e delle aree riservate.
Monitoraggio Real-Time: Registrazione automatica di ingressi e uscite tramite varchi elettronici.
Sicurezza Dinamica: Autorizzazioni differenziate per livelli di accesso (camere, palestre, mense).
Log Eventi: Tracciabilità completa degli accessi per fini di sicurezza e ottimizzazione dei servizi interni.

2.2 Rilevazione Cronometrica e Classifiche
L’integrazione tecnologica si estende al campo di gara per la gestione delle prestazioni sportive.
Integrazione Wearable: Utilizzo di tag RFID ultra-leggeri integrati nelle calzature tecniche degli atleti.
Cronometraggio Automatizzato: Rilevazione istantanea dei tempi di partenza, passaggi intermedi e arrivo al superamento delle linee di rilevazione.
Elaborazione Risultati: Generazione automatica e immediata delle classifiche di gara, riducendo a zero il margine di errore umano.


3. Architettura Tecnologica
Il sistema si articola su tre livelli hardware e software interconnessi:
Hardware di Rilevazione: Antenne e lettori RFID posizionati in punti strategici (varchi d'accesso e linee di traguardo) capaci di gestire letture multiple simultanee ad alta velocità.
Database Centralizzato: Un repository sicuro e ridondato che riceve i dati in tempo reale, garantendo la persistenza e l'integrità delle informazioni relative a ogni singolo atleta.
Engine di Elaborazione: Algoritmi dedicati al calcolo dei tempi e alla validazione degli accessi, con interfaccia di output per la visualizzazione dei risultati e la reportistica.


4. Benefici e Obiettivi
Efficienza Operativa: Eliminazione dei processi di registrazione manuale, riducendo code e tempi d'attesa.
Precisione Scientifica: Garantire un cronometraggio al millesimo di secondo, fondamentale in contesti agonistici di alto livello.
Sicurezza Potenziata: Monitoraggio costante della presenza degli atleti nelle strutture, migliorando i protocolli di emergenza e protezione.
Scalabilità: Architettura flessibile adattabile a diverse discipline sportive e a diverse configurazioni logistiche del villaggio.

Nota Tecnica: Il sistema opera su frequenze standardizzate per evitare interferenze con altre apparecchiature elettroniche presenti nel sito olimpico, garantendo la massima affidabilità anche in condizioni di elevata densità di dispositivi.


5. Panoramica del Sistema
Il progetto si articola su tre livelli principali:
Hardware (Edge): ESP32 che agiscono come gate di accesso e checkpoint di cronometraggio.
Comunicazione: Protocollo MQTT per il trasporto dati asincrono a bassa latenza.
Core & Dashboard: Backend in [Inserire Linguaggio, es: Node.js] e database PostgreSQL per l'elaborazione e la persistenza dei dati.

5.1 Tech Stack
Firmware (ESP32): Legge il tag RFID, cattura il timestamp preciso e invia i dati via Wi-Fi al sistema.
Backend (Node.js/Java): Elabora la logica di business (calcolo tempi e permessi) e coordina il flusso dei dati.
Database (PostgreSQL): Memorizza in modo permanente e strutturato le anagrafiche, i log di accesso e i risultati.
Messaging (MQTT): Funziona da intermediario leggero e veloce per trasportare i messaggi tra l'hardware e il server.
Containerizzazione (Docker): Impacchetta tutti i servizi software per garantire l'avvio identico su ogni computer.
Frontend (React/Vue.js): Visualizza i dati in tempo reale su una dashboard interattiva grazie ai WebSockets.

5.2 Architettura Hardware e Sensori
Unità di Rilevamento (Edge): Microcontrollori ESP32.
Sensori RFID: Moduli RC522 (13.56MHz) o PN532.
Tag: Card o braccialetti 
Gateway/Broker: Raspberry Pi 4 (4GB+) o un PC dedicato.

5.3 Architettura dei Dati
Il sistema gestisce due flussi critici:
Access Control: Validazione in tempo reale dell'UID del tag RFID rispetto al database degli atleti autorizzati.
Event Timing: Registrazione di timestamp precisi al passaggio sui checkpoint per il calcolo automatico dei tempi di gara e generazione della classifica.




6. Percorso Dati
6.1 Layer Edge (Hardware & Firmware)
Tutto inizia quando il tag entra nel campo elettromagnetico dell'antenna collegata all'ESP32.
Scansione: Il modulo RFID legge l'UID (Unique Identifier) del chip.
Arricchimento: L'ESP 32 non invia solo l'UID. Utilizza il suo oscillatore interno per generare un timestamp preciso e aggiunge il proprio device id (per sapere a quale porta o checkpoint ci troviamo).
Packaging: Il firmware impacchetta queste info in un oggetto JSON.
Trasmissione: Il client MQTT sull'ESP 32 pubblica (PUB) il messaggio sul topic dedicato verso l'indirizzo IP del Raspberry Pi.

6.2. Layer di Trasporto (MQTT Broker)
Il dato viaggia via Wi-Fi verso il broker EMQX (che gira in un container Docker).
Disaccoppiamento: Il broker riceve il messaggio ma non sa cosa farne; lo mette semplicemente a disposizione di chiunque sia "iscritto" (SUB) a quel topic. Questo garantisce che, se il database è temporaneamente offline, il messaggio possa essere gestito da un sistema di buffering.

6.3. Layer Backend (Business Logic & Database)
Il vostro servizio backend (Node.js/Go), anch'esso in Docker, è iscritto ai topic del broker.
Ingestione: Il backend "sente" il nuovo messaggio MQTT e lo valida (controlla che il formato JSON sia corretto).
Elaborazione (The Logic):
Se è un accesso: Interroga il DB per vedere se l'atleta associato a quello UID ha il permesso per quell'area.
Se è un cronometraggio: Cerca nel DB se esiste già uno "Start" per quell'atleta e calcola la differenza temporale per ottenere il tempo di gara.
Persistenza: Il risultato viene scritto stabilmente in PostgreSQL.

6.4. Layer Frontend (Real-Time Update)
Qui avviene la magia della visualizzazione senza ricaricare la pagina.
-WebSocket: Invece di aspettare che il sito richieda "ci sono novità?", il backend spinge (Push) il nuovo dato verso il browser tramite un tunnel aperto chiamato WebSocket.
-Rendering: Il framework frontend (React/Vue) riceve il pacchetto, aggiorna lo stato interno e l'atleta "balza" in cima alla classifica o appare un pop-up verde di "Accesso Garantito" sulla mappa.



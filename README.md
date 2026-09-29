# 🛡️ Backuply — QNAP Immutability Vault

**Backuply** è il sistema dedicato di **Backup Immutabile Offsite & Disaster Recovery** per la piattaforma **Taaaac Cloud** e tutti i suoi micro-tenant verticali (*Vendoly, Schedly, Barberly, Tavoly, Taskly*).

Sviluppato per girare direttamente sul tuo **NAS QNAP (Container Station)** all'interno della tua rete locale casalinga, Backuply implementa la regola d'oro del backup professionale **3-2-1** a **costo zero** e con **massima sicurezza contro ransomware**.

---

## 🔒 Perché Backuply è Immutabile e Inattaccabile da Ransomware

1. **Zero Porte Aperte e Niente SSH:**  
   A differenza dei vecchi sistemi basati su chiavi SSH o porte aperte sul router di casa, Backuply effettua chiamate **PULL a senso unico via HTTPS standard (porta 443)** verso `https://taaaac.eu`.
2. **Isolamento Totale delle Credenziali:**  
   Il server VPS non possiede alcuna credenziale o IP del tuo NAS. Se la VPS dovesse mai essere compromessa da un attaccante, quest'ultimo **non potrà mai raggiungere né cancellare i backup storici salvati sul NAS di casa**.
3. **Verifica Crittografica SHA-256 e Integrità SQLite:**  
   Ogni snapshot viene generato a caldo tramite `sqlite3 .backup`, compresso in formato `.db.gz`, verificato con `PRAGMA integrity_check` e corredato di digest crittografico SHA-256.

---

## 🚀 Installazione su Server Debian / Docker Host (Consigliato)

Se sul tuo QNAP o nella tua rete hai una VM / container **Debian** con Docker installato, l'avvio richiede letteralmente **30 secondi**:

```bash
# 1. Clona il repository nella tua cartella preferita (es. /opt/backuply o ~/backuply)
git clone https://github.com/shadowkrad/Backuply.git /opt/backuply
cd /opt/backuply

# 2. Avvia il container in background (compila automaticamente l'immagine)
docker compose up -d --build

# 3. Controlla che i log siano attivi
docker compose logs -f
```

La cartella `./backups` all'interno di `/opt/backuply/backups` conterrà tutti i file compressi `.db.gz`.  
*(Se la tua VM Debian ha un mount NFS o SMB verso lo storage del QNAP, puoi mappare ad es. `/mnt/qnap/backups:/backups` nel `docker-compose.yml`)*.

---

### Alternativa: Avvio tramite QNAP Container Station GUI
Se preferisci usare l'interfaccia grafica di Container Station:
1. Apri **Container Station** -> **Applicazioni** -> **Crea**.
2. Incolla il contenuto di `docker-compose.yml`.
3. Clicca su **Crea**.

### Passo 3: Accedi alla Web UI
Apri il tuo browser all'indirizzo del NAS:  
👉 **`http://<IP-DEL-TUO-QNAP>:3005`**

---

## 💻 Interfaccia Web e Funzionalità

- **Dashboard KPI & Status Bar:** visualizza lo spazio disco totale consumato su QNAP, il conteggio degli snapshot immutabili, lo stato del backup automatico notturno e delle notifiche Telegram.
- **Schedulatore Automatico Notturno Integrato:** motore interno in background per l'esecuzione automatica del backup ogni notte all'orario desiderato (es. ore `03:00` programmabile con flag On/Off e time picker).
- **Gestore Notifiche Telegram:** invio automatico su canale o chat privata dell'esito dettagliato (positivo 🟢 o negativo 🔴) di ogni backup, con volume scaricato, snapshot archiviati, SHA-256 e pulsante di test immediato integrato.
- **Istanze Cloud Monitorate:** schede per *Taaaac Core Platform*, *Little Creations Family (Vendoly)*, *BF Estetica (Schedly)* e tutti gli altri tenant registrati con data dell'ultimo backup e dimensione.
- **Esegui Snapshot Globale:** un click per richiedere la generazione e il download atomico manuale di tutti i database.
- **Caveau Immutabile:** tabella completa con SHA-256 hash, badge WORM, download diretto via browser e guida al ripristino (Disaster Recovery).
- **Impostazioni Personalizzabili & Retention:** modifica al volo URL VPS, token segreto, percorso su QNAP, retention automatica (es. 30 giorni) e credenziali bot Telegram.

---

## 🆘 Disaster Recovery: Come Ripristinare un Database

In caso di guasto hardware o necessità di ripristinare un database:

### Opzione A: Ispezione Rapida Offline (Zero Rischi)
1. Clicca su **Scarica** accanto allo snapshot desiderato nella Web UI di Backuply.
2. Estrai il file `.db.gz` con 7-Zip o terminale (`gunzip backup_xxx.db.gz`).
3. Apri il file `.db` con [DB Browser for SQLite](https://sqlitebrowser.org/) o DBeaver per consultare clienti, ordini o configurazioni passate in sola lettura.

### Opzione B: Ripristino Atomico su VPS Aruba
Per ripristinare il database di produzione sul server:

**Per un Tenant (es. Little Creations Family):**
```bash
gunzip -c backup_littlecreationsfamily_20260928_030000.db.gz > /opt/taaaac-tenants/littlecreationsfamily/data/prod.db
docker restart vendoly-littlecreationsfamily
```

**Per Taaaac Core Platform:**
```bash
gunzip -c backup_core_20260928_030000.db.gz > /tmp/prod.db
sqlite3 /tmp/prod.db "PRAGMA integrity_check;"
docker cp /tmp/prod.db taaaac-core:/app/data/prod.db
docker restart taaaac-core
```

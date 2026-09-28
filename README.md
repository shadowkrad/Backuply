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

## 🚀 Installazione su NAS QNAP (Container Station)

### Passo 1: Crea la cartella dei backup sul QNAP
Apri **File Station** sul tuo QNAP e crea una cartella condivisa (oppure una sottocartella in una cartella esistente), ad esempio:  
`/share/Backups/Taaaac`  
*(Se il tuo volume principale è CACHEDEV1, il percorso assoluto sarà `/share/CACHEDEV1_DATA/Backups/Taaaac`)*.

### Passo 2: Avvia Backuply in Container Station
1. Apri **Container Station** sul QNAP.
2. Vai su **Applicazioni** (Applications) -> **Crea** (Create).
3. Assegna il nome dell'applicazione: `backuply`.
4. Incolla il seguente contenuto `docker-compose.yml`:

```yaml
version: "3.8"

services:
  backuply:
    image: node:22-alpine
    container_name: backuply
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3005:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TAAAAC_CORE_URL=https://taaaac.eu
      - BACKUPLY_SECRET_TOKEN=taaaac-backuply-secure-token
      - BACKUPLY_STORAGE_PATH=/backups
    volumes:
      - /share/Container/backuply/data:/app/data
      - /share/Backups/Taaaac:/backups
    command: >
      sh -c "npm install -g npm@latest && 
             git clone https://github.com/shadowkrad/Backuply.git /app_src && 
             cd /app_src && npm ci && npm run build && 
             cp -r /app_src/.next/standalone/* /app/ && 
             cp -r /app_src/.next/static /app/.next/static && 
             cp -r /app_src/public /app/public && 
             cd /app && node server.js"
```

*Oppure compila direttamente il Dockerfile tramite git / Container Station.*

### Passo 3: Accedi alla Web UI
Apri il tuo browser all'indirizzo del NAS:  
👉 **`http://<IP-DEL-TUO-QNAP>:3005`**

---

## 💻 Interfaccia Web e Funzionalità

- **Dashboard KPI:** visualizza lo spazio disco totale consumato su QNAP, il conteggio degli snapshot immutabili e lo stato della connessione HTTPS a Taaaac Cloud.
- **Istanze Cloud Monitorate:** schede per *Taaaac Core Platform*, *Little Creations Family (Vendoly)* e tutti gli altri tenant registrati con data dell'ultimo backup e dimensione.
- **Esegui Snapshot Globale:** un click per richiedere la generazione e il download atomico di tutti i database.
- **Caveau Immutabile:** tabella completa con SHA-256 hash, badge WORM, download diretto via browser e guida al ripristino (Disaster Recovery).
- **Impostazioni Personalizzabili:** modifica al volo URL VPS, token segreto, percorso su QNAP e retention dei file.

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

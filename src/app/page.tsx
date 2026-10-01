"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  HardDrive,
  RefreshCw,
  Download,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  Calendar,
  Layers,
  ExternalLink,
  Copy,
  Info,
  Check,
  Server,
  CloudLightning,
  Sparkles,
  RotateCcw,
  Bell,
  Clock,
  Send,
  Box,
  ChevronDown,
  LayoutGrid,
  List,
  Terminal,
} from "lucide-react";
import { BackupSnapshot, TenantBackupStatus, BackuplySettings } from "@/lib/types";

export default function BackuplyDashboard() {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [tenants, setTenants] = useState<TenantBackupStatus[]>([]);
  const [settings, setSettings] = useState<BackuplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null); // "all" o subdomain specifico
  const [stats, setStats] = useState({ count: 0, totalFormatted: "0 Bytes", totalBytes: 0, directory: "" });
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [selectedSnapshotByTarget, setSelectedSnapshotByTarget] = useState<Record<string, string>>({});
  const [vaultViewMode, setVaultViewMode] = useState<"blocks" | "table">("blocks");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<BackupSnapshot | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Caricamento dati iniziale
  const loadData = async () => {
    setLoading(true);
    try {
      const [snapRes, tenRes, setRes] = await Promise.all([
        fetch("/api/snapshots").then((r) => r.json()).catch(() => ({ snapshots: [] })),
        fetch("/api/tenants").then((r) => r.json()).catch(() => ({ tenants: [] })),
        fetch("/api/settings").then((r) => r.json()).catch(() => ({ settings: null })),
      ]);

      if (snapRes.ok) {
        setSnapshots(snapRes.snapshots || []);
        setStats({
          count: snapRes.count || 0,
          totalFormatted: snapRes.totalFormatted || "0 Bytes",
          totalBytes: snapRes.totalBytes || 0,
          directory: snapRes.directory || "",
        });
      }

      if (tenRes.ok) {
        setTenants(tenRes.tenants || []);
      }

      if (setRes.ok && setRes.settings) {
        setSettings(setRes.settings);
      }
    } catch (err: any) {
      console.error("Errore caricamento dati:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSync = async (subdomain: string = "all") => {
    setSyncing(subdomain);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain }),
      });
      const data = await res.json();

      if (data.ok) {
        showToast(data.message || "Snapshot salvato con successo!", "success");
        await loadData();
      } else {
        showToast(data.message || data.errors?.[0] || "Errore sincronizzazione", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Errore di connessione verso il cloud", "error");
    } finally {
      setSyncing(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Configurazione salvata con successo!");
        setShowSettingsModal(false);
      } else {
        showToast(data.error || "Errore salvataggio", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleTestTelegram = async () => {
    if (!settings?.telegramBotToken || !settings?.telegramChatId) {
      showToast("Inserisci sia il Bot Token che il Chat ID per testare Telegram", "error");
      return;
    }
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.message || "Messaggio di prova inviato con successo!" });
        showToast("Notifica Telegram inviata con successo!", "success");
      } else {
        setTestResult({ ok: false, message: data.error || "Errore invio notifica Telegram" });
        showToast(data.error || "Errore test Telegram", "error");
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Errore di connessione" });
      showToast(err.message, "error");
    } finally {
      setTestingTelegram(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(text);
    setTimeout(() => setCopiedSha(null), 2500);
  };

  const getModuleColor = (mod: string) => {
    switch (mod) {
      case "core":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "vendoly":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "schedly":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "barberly":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "tavoly":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "taskly":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // Calcolo delle macchine Docker uniche
  const targetMachines = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      subdomain: string;
      containerName: string;
      moduleType: string;
      dbType: "sqlite" | "postgres";
      dbLabel: string;
      customDomain?: string;
      snapshots: BackupSnapshot[];
    }> = [];

    const seenTargets = new Set<string>();

    // 1. Prima le istanze note da tenants
    for (const t of tenants) {
      seenTargets.add(t.subdomain);
      const isPostgres = t.moduleType === "schedly" || t.subdomain === "bfestetica";
      const containerName = t.subdomain === "core" ? "taaaac-core" : `${t.moduleType}-${t.subdomain}`;
      const machineSnaps = snapshots.filter((s) => s.target === t.subdomain);

      list.push({
        id: t.subdomain,
        name: t.name,
        subdomain: t.subdomain,
        containerName,
        moduleType: t.moduleType,
        dbType: isPostgres ? "postgres" : "sqlite",
        dbLabel: isPostgres ? "PostgreSQL (taaaac-postgres)" : "SQLite 3 (prod.db)",
        customDomain: t.customDomain,
        snapshots: machineSnaps,
      });
    }

    // 2. Eventuali snapshot orfani con target non ancora in tenants
    for (const snap of snapshots) {
      if (!seenTargets.has(snap.target)) {
        seenTargets.add(snap.target);
        const isPostgres = snap.moduleType === "schedly" || snap.target === "bfestetica" || snap.fileName.endsWith(".sql.gz");
        const containerName = snap.target === "core" ? "taaaac-core" : `${snap.moduleType}-${snap.target}`;
        const machineSnaps = snapshots.filter((s) => s.target === snap.target);

        list.push({
          id: snap.target,
          name: snap.target === "core" ? "Taaaac Core System" : snap.target,
          subdomain: snap.target,
          containerName,
          moduleType: snap.moduleType,
          dbType: isPostgres ? "postgres" : "sqlite",
          dbLabel: isPostgres ? "PostgreSQL (taaaac-postgres)" : "SQLite 3 (prod.db)",
          snapshots: machineSnaps,
        });
      }
    }

    if (list.length === 0) {
      list.push({
        id: "core",
        name: "Taaaac Core System",
        subdomain: "core",
        containerName: "taaaac-core",
        moduleType: "core",
        dbType: "sqlite",
        dbLabel: "SQLite 3 (prod.db)",
        snapshots: [],
      });
    }

    return list;
  }, [tenants, snapshots]);

  const copyRestoreCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  const getRestoreCommand = (snap: BackupSnapshot) => {
    const isPostgres = snap.moduleType === "schedly" || snap.target === "bfestetica" || snap.fileName.endsWith(".sql.gz");
    const container = snap.target === "core" ? "taaaac-core" : `${snap.moduleType}-${snap.target}`;

    if (isPostgres) {
      const dbName = `schedly_${snap.target}`;
      return `gunzip -c ${snap.fileName} | docker exec -i taaaac-postgres psql -U taaaac -d ${dbName} && docker restart ${container}`;
    }

    if (snap.target === "core") {
      return `gunzip -c ${snap.fileName} > /tmp/prod.db && sqlite3 /tmp/prod.db "PRAGMA integrity_check;" && docker cp /tmp/prod.db taaaac-core:/app/data/prod.db && docker restart taaaac-core`;
    }

    return `gunzip -c ${snap.fileName} > /tmp/prod.db && sqlite3 /tmp/prod.db "PRAGMA integrity_check;" && docker cp /tmp/prod.db ${container}:/app/data/prod.db && docker restart ${container}`;
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Toast Notifiche */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/40 text-rose-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Principale */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-900/30">
            <div className="w-full h-full bg-[#0d1424] rounded-[14px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Backuply</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                v1.0.0
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                QNAP Vault
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Sistema di Backup Immutabile Offsite & Disaster Recovery via HTTPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4 text-slate-400" />
            Impostazioni
          </button>
          <button
            onClick={() => handleSync("all")}
            disabled={syncing !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing === "all" ? "Sincronizzazione in corso..." : "Esegui Snapshot Globale"}
          </button>
        </div>
      </header>

      {/* Banner Notifiche Telegram & Scheduler Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">Backup Notturno:</span>
            {settings?.autoBackupEnabled !== false ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Attivo ore {settings?.autoBackupTime || "03:00"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Disattivato
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">Notifiche Telegram:</span>
            {settings?.telegramAlertsEnabled && settings?.telegramBotToken && settings?.telegramChatId ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Attive (Chat: {settings.telegramChatId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Non configurate
              </span>
            )}
          </div>
        </div>

        {settings?.lastBackupRunAt && (
          <div className="text-slate-400 flex items-center gap-2 text-[11px]">
            <span>Ultimo backup:</span>
            <strong className="text-slate-200">
              {new Date(settings.lastBackupRunAt).toLocaleString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            {settings.lastBackupStatus === "SUCCESS" ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                ● Eseguito
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                ● Errore
              </span>
            )}
          </div>
        )}
      </div>

      {/* Griglia KPI & Statistiche */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Archivio QNAP</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalFormatted}</div>
          <p className="text-xs text-slate-400 mt-1 truncate" title={stats.directory}>
            📂 {stats.directory || "/backups"}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Snapshot Immutabili</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.count}</div>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% SHA-256 Verificati
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Istanze Protette</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{tenants.length || 2}</div>
          <p className="text-xs text-slate-400 mt-1">Core + Micro-Tenant Isolati</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Canale di Backup</span>
            <CloudLightning className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Pull HTTPS (Porta 443)
          </div>
          <p className="text-xs text-slate-400 mt-1">Zero porte SSH aperte verso il NAS</p>
        </div>
      </section>

      {/* Sezione 1: Istanze Cloud Attive */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Istanze Cloud Monitorate
            </h2>
            <p className="text-xs text-slate-400">Database SQLite attivi su Taaaac Cloud VPS pronti per il salvataggio</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Aggiorna stato
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white text-base leading-snug">{t.name}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {t.customDomain || `${t.subdomain}.taaaac.eu`}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border uppercase tracking-wider ${getModuleColor(t.moduleType)}`}>
                    {t.moduleType}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Ultimo Backup:</span>
                    <span className="text-slate-200 font-medium">
                      {t.lastBackupAt ? new Date(t.lastBackupAt).toLocaleString("it-IT") : "In attesa"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Dimensione:</span>
                    <span className="text-slate-200 font-mono">{t.lastBackupSize || "—"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Copie su QNAP:</span>
                    <span className="text-emerald-400 font-semibold">
                      {snapshots.filter((s) => s.target === t.subdomain).length} copie
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                    <span>Storico su VPS Cloud:</span>
                    <span>{t.totalSnapshots} copie</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSync(t.subdomain)}
                disabled={syncing !== null}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing === t.subdomain ? "animate-spin" : ""}`} />
                {syncing === t.subdomain ? "Salvataggio..." : "Salva Snapshot Ora"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Sezione 2: Caveau Snapshot Immutabili su QNAP */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Caveau Snapshot Immutabili su QNAP
            </h2>
            <p className="text-xs text-slate-400">
              Visualizzazione organizzata per container Docker con selettore storico di versione e ripristino istantaneo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              Retention: <span className="text-emerald-400 font-semibold">{settings?.retentionDays || 30} giorni</span>
            </span>
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setVaultViewMode("blocks")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vaultViewMode === "blocks"
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Blocchi Docker
              </button>
              <button
                type="button"
                onClick={() => setVaultViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vaultViewMode === "table"
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Tabella Storico
              </button>
            </div>
          </div>
        </div>

        {/* Vista a Blocchi Docker (Default) */}
        {vaultViewMode === "blocks" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {targetMachines.map((machine) => {
              const selectedSnapId = selectedSnapshotByTarget[machine.id];
              const selectedSnap =
                machine.snapshots.find((s) => s.id === selectedSnapId) ||
                (machine.snapshots.length > 0 ? machine.snapshots[0] : null);

              return (
                <div
                  key={machine.id}
                  className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition-all"
                >
                  {/* Testata del Blocco Macchina */}
                  <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700/60 shrink-0 mt-0.5">
                          <Box className="w-5 h-5" />
                        </div>
                        <div>
                          <span
                            className="font-mono text-sm font-bold text-white tracking-wide block"
                            title={machine.containerName}
                          >
                            {machine.containerName}
                          </span>
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wider ${getModuleColor(
                                machine.moduleType
                              )}`}
                            >
                              {machine.moduleType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-medium">{machine.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-800/50 flex items-center justify-between text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          machine.dbType === "postgres"
                            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                            : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                        }`}
                      >
                        <Database className="w-3 h-3" />
                        {machine.dbLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {machine.snapshots.length} {machine.snapshots.length === 1 ? "copia QNAP" : "copie QNAP"}
                      </span>
                    </div>
                  </div>

                  {/* Corpo: Selettore a tendina dei backup e ispettore versione */}
                  <div className="p-5 space-y-4 flex-1">
                    {machine.snapshots.length > 0 && selectedSnap ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              Seleziona Versione Archiviata:
                            </span>
                          </label>
                          <div className="relative">
                            <select
                              value={selectedSnap.id}
                              onChange={(e) =>
                                setSelectedSnapshotByTarget((prev) => ({
                                  ...prev,
                                  [machine.id]: e.target.value,
                                }))
                              }
                              className="w-full appearance-none rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono pr-9 cursor-pointer hover:border-slate-600 transition-colors shadow-inner"
                            >
                              {machine.snapshots.map((snap, idx) => (
                                <option key={snap.id} value={snap.id}>
                                  {idx === 0 ? "★ ULTIMO — " : "• "}
                                  {new Date(snap.createdAt).toLocaleString("it-IT")} ({snap.sizeFormatted})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                          </div>
                        </div>

                        {/* Scheda Dettaglio Snapshot Selezionato */}
                        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[11px] shrink-0">File Snapshot:</span>
                            <span
                              className="font-mono text-emerald-300 font-medium text-[11px] truncate text-right"
                              title={selectedSnap.fileName}
                            >
                              {selectedSnap.fileName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Data Snapshot:</span>
                            <span className="text-slate-200 text-[11px] font-medium">
                              {new Date(selectedSnap.createdAt).toLocaleString("it-IT")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Dimensione Compressa:</span>
                            <span className="font-mono text-slate-200 text-[11px] font-bold">
                              {selectedSnap.sizeFormatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400 text-[11px]">Digest SHA-256:</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedSnap.sha256)}
                              className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-emerald-400 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-800 transition-colors"
                              title="Clicca per copiare hash SHA-256"
                            >
                              <span className="truncate max-w-[110px]">{selectedSnap.sha256}</span>
                              {copiedSha === selectedSnap.sha256 ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Stato Protezione:</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Immutabile WORM
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs space-y-3">
                        <p>Nessuno snapshot archiviato per questo container su QNAP.</p>
                        <button
                          type="button"
                          onClick={() => handleSync(machine.id)}
                          disabled={syncing !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncing === machine.id ? "animate-spin" : ""}`} />
                          {syncing === machine.id ? "Salvataggio..." : "Salva Primo Snapshot"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pulsanti Azione sul Snapshot Selezionato */}
                  {machine.snapshots.length > 0 && selectedSnap && (
                    <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 flex items-center gap-2">
                      <a
                        href={`/api/download/${encodeURIComponent(selectedSnap.fileName)}`}
                        download
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-600/50 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition-colors shadow-sm"
                        title="Scarica questo file compresso dal QNAP"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Scarica
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowRecoveryModal(selectedSnap)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        title="Mostra istruzioni e comando per ripristino o rollback"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        Rollback
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Tabellare Storico Completo */
          <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 font-medium">
                  <tr>
                    <th className="py-3.5 px-4">Container & Target</th>
                    <th className="py-3.5 px-4">Data di Generazione</th>
                    <th className="py-3.5 px-4">Peso</th>
                    <th className="py-3.5 px-4">Digest SHA-256</th>
                    <th className="py-3.5 px-4">Stato Vault</th>
                    <th className="py-3.5 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                        Nessuno snapshot ancora archiviato su QNAP. Clicca su &quot;Esegui Snapshot Globale&quot; per avviare il primo backup.
                      </td>
                    </tr>
                  ) : (
                    snapshots.map((snap) => {
                      const container = snap.target === "core" ? "taaaac-core" : `${snap.moduleType}-${snap.target}`;
                      return (
                        <tr key={snap.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <Box className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-mono font-semibold text-white text-xs block">
                                  {container}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {snap.target === "core" ? "Taaaac Core" : snap.target}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(snap.createdAt).toLocaleString("it-IT")}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                            {snap.sizeFormatted}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <button
                              onClick={() => copyToClipboard(snap.sha256)}
                              title="Clicca per copiare l'hash SHA-256"
                              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <span className="truncate max-w-[120px]">{snap.sha256}</span>
                              {copiedSha === snap.sha256 ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Immutabile WORM
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setShowRecoveryModal(snap)}
                                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Disaster Recovery / Info Ripristino"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`/api/download/${encodeURIComponent(snap.fileName)}`}
                                download
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-600/50 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold transition-colors"
                                title="Scarica file compresso dal QNAP"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Scarica
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modal Impostazioni */}
      {showSettingsModal && settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-emerald-400" />
                  Impostazioni Caveau Backuply
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configura storage QNAP, orario del backup automatico e notifiche Telegram
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Sezione 1: Parametri Connessione Taaaac */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                  <Server className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    1. Connessione Cloud Taaaac (Pull HTTPS)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      URL Taaaac Core Platform
                    </label>
                    <input
                      type="text"
                      value={settings.taaaacCoreUrl}
                      onChange={(e) => setSettings({ ...settings, taaaacCoreUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Token Segreto (x-backuply-token)
                    </label>
                    <input
                      type="password"
                      value={settings.backupSecretToken}
                      onChange={(e) => setSettings({ ...settings, backupSecretToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Percorso Storage QNAP
                    </label>
                    <input
                      type="text"
                      value={settings.qnapStoragePath}
                      onChange={(e) => setSettings({ ...settings, qnapStoragePath: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sezione 2: Schedulazione Automatica & Orario */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      2. Schedulazione Automatica & Orario
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackupEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400">
                  Esegue in background ogni notte l&apos;acquisizione completa dei database di tutti i tenant e di Taaaac Core.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Orario Esecuzione Giornaliero
                    </label>
                    <input
                      type="time"
                      value={settings.autoBackupTime || "03:00"}
                      onChange={(e) => setSettings({ ...settings, autoBackupTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Es. 03:00 ogni notte</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Retention (Giorni)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.retentionDays || 30}
                      onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Auto-rimozione oltre N gg</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Espressione Cron
                    </label>
                    <input
                      type="text"
                      value={settings.cronSchedule || "0 3 * * *"}
                      onChange={(e) => setSettings({ ...settings, cronSchedule: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Default: 0 3 * * *</span>
                  </div>
                </div>
              </div>

              {/* Sezione 3: Notifiche Telegram (Esito Positivo & Negativo) */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      3. Gestore Notifiche Telegram
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.telegramAlertsEnabled)}
                      onChange={(e) => setSettings({ ...settings, telegramAlertsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400">
                  Ricevi in tempo reale su Telegram il resoconto completo con esito, snapshot scaricati, dimensione e SHA-256.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Telegram Bot Token (da @BotFather)
                    </label>
                    <input
                      type="password"
                      placeholder="es. 123456789:ABCdefGhIjkLmNoPqRsTuVwXyZ"
                      value={settings.telegramBotToken || ""}
                      onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Chat ID o Canale Destinatario
                    </label>
                    <input
                      type="text"
                      placeholder="es. 12345678 oppure -100123456789"
                      value={settings.telegramChatId || ""}
                      onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.telegramNotifyOnSuccess !== false}
                        onChange={(e) => setSettings({ ...settings, telegramNotifyOnSuccess: e.target.checked })}
                        className="rounded border-slate-700 text-blue-500 focus:ring-0"
                      />
                      <span>Invia notifica anche su esito positivo (oltre che su errore)</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !settings.telegramBotToken || !settings.telegramChatId}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {testingTelegram ? "Invio test in corso..." : "Invia Notifica di Prova"}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        testResult.ok
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottoni Azione Salvataggio */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-95"
                >
                  Salva Tutte le Configurazioni
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Disaster Recovery */}
      {showRecoveryModal && (() => {
        const isPostgres =
          showRecoveryModal.moduleType === "schedly" ||
          showRecoveryModal.target === "bfestetica" ||
          showRecoveryModal.fileName.endsWith(".sql.gz");
        const container =
          showRecoveryModal.target === "core"
            ? "taaaac-core"
            : `${showRecoveryModal.moduleType}-${showRecoveryModal.target}`;
        const restoreCmd = getRestoreCommand(showRecoveryModal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Procedura di Rollback & Ripristino
                    </h3>
                    <p className="text-xs text-slate-400">
                      Container Docker: <span className="font-mono text-emerald-400 font-semibold">{container}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                {/* Dettagli Snapshot */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">File Snapshot QNAP:</span>
                    <span className="font-mono text-emerald-300 font-medium truncate max-w-[280px]">
                      {showRecoveryModal.fileName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Motore Database:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isPostgres ? "text-indigo-400" : "text-cyan-400"
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      {isPostgres ? "PostgreSQL 16 (taaaac-postgres)" : "SQLite 3 (prod.db)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Generazione:</span>
                    <span>{new Date(showRecoveryModal.createdAt).toLocaleString("it-IT")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensione Compressa:</span>
                    <span className="font-mono">{showRecoveryModal.sizeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Digest SHA-256:</span>
                    <span className="font-mono text-slate-400 truncate max-w-[280px]">{showRecoveryModal.sha256}</span>
                  </div>
                </div>

                {/* Opzione A: Ispezione Offline */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-sky-400" />
                    Opzione A: Ispezione in Sola Lettura (Zero Rischi in Produzione)
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Scarica il file compresso con il pulsante &quot;Scarica File&quot;, decomprimilo ed aprilo in locale con{" "}
                    <strong>{isPostgres ? "DBeaver / pgAdmin" : "DB Browser for SQLite / DBeaver"}</strong> per consultare tabelle, clienti, ordini o prenotazioni storiche senza toccare l&apos;ambiente cloud VPS.
                  </p>
                </div>

                {/* Opzione B: Rollback a Caldo in VPS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Opzione B: Ripristino Atomico su VPS Aruba
                    </h4>
                    <button
                      type="button"
                      onClick={() => copyRestoreCommand(restoreCmd)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {copiedCommand ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiato!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copia Comando
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Esegui questo comando sul terminale SSH di Aruba (<code>root@80.211.130.61</code>):
                  </p>
                  <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-200 border border-slate-800 overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">
                    {restoreCmd}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-800">
                <a
                  href={`/api/download/${encodeURIComponent(showRecoveryModal.fileName)}`}
                  download
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600/50 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Scarica File Ora
                </a>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(null)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

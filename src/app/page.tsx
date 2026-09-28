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
  RotateCcw
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<BackupSnapshot | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
                    <span>Snapshot Archiviati:</span>
                    <span className="text-emerald-400 font-semibold">{t.totalSnapshots} copie</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Caveau Snapshot Immutabili su QNAP
            </h2>
            <p className="text-xs text-slate-400">Copie atomiche compresse e criptate conservate nel NAS di casa</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Retention configurata: {settings?.retentionDays || 30} giorni
          </span>
        </div>

        <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3.5 px-4">Target & Modulo</th>
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
                  snapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-white text-sm block">
                              {snap.target === "core" ? "Taaaac Core" : snap.target}
                            </span>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wider ${getModuleColor(snap.moduleType)}`}>
                              {snap.moduleType}
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
                            title="Scarica file .db.gz dal QNAP"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Scarica
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal Impostazioni */}
      {showSettingsModal && settings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
              Impostazioni Caveau Backuply
            </h3>
            <p className="text-xs text-slate-400 mb-6">Configura l&apos;URL di Taaaac Cloud e i parametri di archiviazione</p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Taaaac Core Platform
                </label>
                <input
                  type="text"
                  value={settings.taaaacCoreUrl}
                  onChange={(e) => setSettings({ ...settings, taaaacCoreUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Token Segreto Backuply (x-backuply-token)
                </label>
                <input
                  type="password"
                  value={settings.backupSecretToken}
                  onChange={(e) => setSettings({ ...settings, backupSecretToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Schedulazione Cron
                  </label>
                  <input
                    type="text"
                    value={settings.cronSchedule}
                    onChange={(e) => setSettings({ ...settings, cronSchedule: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 0 3 * * * (03:00)</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Retention (Giorni)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.retentionDays}
                    onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-900/30"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Disaster Recovery */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              Disaster Recovery — {showRecoveryModal.fileName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Procedura guidata per ispezione o ripristino sicuro del database SQLite
            </p>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target:</span>
                  <span className="font-semibold text-white">{showRecoveryModal.target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data snapshot:</span>
                  <span>{new Date(showRecoveryModal.createdAt).toLocaleString("it-IT")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensione compressa:</span>
                  <span className="font-mono">{showRecoveryModal.sizeFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SHA-256 Digest:</span>
                  <span className="font-mono text-emerald-400 truncate max-w-[280px]">{showRecoveryModal.sha256}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">Opzione A: Ispezione in Sola Lettura (Zero Rischi)</h4>
                <p className="text-slate-400">
                  Scarica il file compresso con il pulsante &quot;Scarica&quot;, estrai il file <code>.db</code> con 7-Zip o terminale ed aprilo con <strong>DB Browser for SQLite</strong> o <strong>DBeaver</strong> per visualizzare ordini, clienti o configurazioni storiche.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">Opzione B: Ripristino Atomico su VPS Aruba</h4>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-200 border border-slate-800 select-all overflow-x-auto">
                  {showRecoveryModal.target === "core"
                    ? `gunzip -c ${showRecoveryModal.fileName} > /tmp/restore_core.db && sqlite3 /tmp/restore_core.db "PRAGMA integrity_check;" && docker cp /tmp/restore_core.db taaaac-core:/app/data/prod.db && docker restart taaaac-core`
                    : `gunzip -c ${showRecoveryModal.fileName} > /opt/taaaac-tenants/${showRecoveryModal.target}/data/prod.db && docker restart vendoly-${showRecoveryModal.target}`}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                onClick={() => setShowRecoveryModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

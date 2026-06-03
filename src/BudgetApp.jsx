import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "budget-data";
const EURO = "\u20ac";

const formatEuroInput = (value) =>
  new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const parseAmount = (value) => {
  const normalized = String(value).replace(/[^\d,.]/g, "").replace(",", ".");
  return normalized === "" ? 0 : Number(normalized);
};

function MoneyInput({ disabled = false, value, onValueChange }) {
  const [draft, setDraft] = useState(formatEuroInput(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatEuroInput(value));
    }
  }, [isFocused, value]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-zinc-500">{EURO}</span>
      <input
        className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none disabled:cursor-not-allowed disabled:text-zinc-500"
        disabled={disabled}
        inputMode="decimal"
        onBlur={() => {
          setIsFocused(false);
          setDraft(formatEuroInput(parseAmount(draft)));
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d,.]/g, "");
          setDraft(next);
          onValueChange(parseAmount(next));
        }}
        onFocus={() => setIsFocused(true)}
        style={{ fontSize: "16px" }}
        type="text"
        value={draft}
      />
    </div>
  );
}

export default function BudgetApp() {
  const [saldo, setSaldo] = useState(0);
  const [chebanca, setChebanca] = useState(0);
  const [revolut, setRevolut] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [minimo, setMinimo] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [monitorStartDate, setMonitorStartDate] = useState(null);
  const [monitorStartSaldo, setMonitorStartSaldo] = useState(null);
  const [monitorStartBudget, setMonitorStartBudget] = useState(null);
  const [settingsEditable, setSettingsEditable] = useState(false);
  const [showResetMonitorConfirm, setShowResetMonitorConfirm] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      setSaldo(parsed.saldo || 0);
      setChebanca(parsed.chebanca || 0);
      setRevolut(parsed.revolut || 0);
      setTargetDate(parsed.targetDate || "");
      setMinimo(parsed.minimo || 0);
      setLastUpdate(parsed.lastUpdate || null);
      setMonitorStartDate(parsed.monitorStartDate || null);
      setMonitorStartSaldo(parsed.monitorStartSaldo ?? null);
      setMonitorStartBudget(parsed.monitorStartBudget ?? null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        saldo,
        chebanca,
        revolut,
        targetDate,
        minimo,
        lastUpdate,
        monitorStartDate,
        monitorStartSaldo,
        monitorStartBudget
      })
    );
  }, [
    saldo,
    chebanca,
    revolut,
    targetDate,
    minimo,
    lastUpdate,
    monitorStartDate,
    monitorStartSaldo,
    monitorStartBudget
  ]);

  const formatEuro = (value) => `${EURO} ${formatEuroInput(value)}`;

  const formatDate = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatLastUpdate = (value) => {
    if (!value) return "--/--/---- alle ore --:--";

    if (typeof value === "object" && value.date && value.time) {
      return `${value.date} alle ore ${value.time}`;
    }

    return `${value} alle ore --:--`;
  };

  const parseItalianDate = (value) => {
    if (!value) return null;
    const [day, month, year] = value.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const saldoCalcolato = useMemo(() => {
    return Number(chebanca || 0) + Number(revolut || 0);
  }, [chebanca, revolut]);

  const giorniRestanti = useMemo(() => {
    if (!targetDate) return 0;

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const stipendio = new Date(targetDate);
    stipendio.setHours(0, 0, 0, 0);

    const diff = Math.ceil((stipendio - oggi) / 86400000);
    return diff > 0 ? diff : 0;
  }, [targetDate]);

  const budgetMensileNettoRiserva = useMemo(() => {
    return saldo - minimo;
  }, [saldo, minimo]);

  const budgetGiornaliero = useMemo(() => {
    if (giorniRestanti <= 0) return 0;
    return (saldo - minimo) / giorniRestanti;
  }, [saldo, minimo, giorniRestanti]);

  const andamento = useMemo(() => {
    if (!monitorStartDate || monitorStartSaldo === null || monitorStartBudget === null) {
      return null;
    }

    const start = parseItalianDate(monitorStartDate);
    if (!start) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const giorniTrascorsi = Math.floor((today - start) / 86400000);

    if (giorniTrascorsi < 1) {
      return {
        stato: "neutral",
        testo: "Monitoraggio avviato oggi"
      };
    }

    const spesaReale = monitorStartSaldo - saldoCalcolato;
    const budgetPrevisto = monitorStartBudget * giorniTrascorsi;
    const differenza = budgetPrevisto - spesaReale;

    let stato = "green";

    if (differenza < 0) {
      const sforamento = Math.abs(differenza) / budgetPrevisto;
      stato = sforamento <= 0.5 ? "orange" : "red";
    }

    return {
      stato,
      differenza,
      giorniTrascorsi,
      spesaReale,
      budgetPrevisto
    };
  }, [monitorStartDate, monitorStartSaldo, monitorStartBudget, saldoCalcolato]);

  const andamentoText = useMemo(() => {
    if (!andamento) return "Nessun monitoraggio attivo";
    if (andamento.stato === "neutral") return "Monitoraggio avviato oggi";
    if (andamento.differenza >= 0) {
      return `${formatEuro(andamento.differenza)} sotto il budget previsto`;
    }
    return `${formatEuro(Math.abs(andamento.differenza))} sopra il budget previsto`;
  }, [andamento]);

  const andamentoClassName = useMemo(() => {
    if (!andamento || andamento.stato === "neutral") {
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    }

    if (andamento.stato === "green") {
      return "bg-green-100 text-green-800 border-green-200";
    }

    if (andamento.stato === "orange") {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }

    return "bg-red-100 text-red-800 border-red-200";
  }, [andamento]);

  const confermaSaldo = () => {
    const now = new Date();
    const timestamp = {
      date: formatDate(now),
      time: formatTime(now)
    };

    setSaldo(saldoCalcolato);
    setLastUpdate(timestamp);
  };

  const iniziaMonitoraggio = () => {
    const timestamp = formatDate(new Date());

    setMonitorStartDate(timestamp);
    setMonitorStartSaldo(saldoCalcolato);
    setMonitorStartBudget(budgetGiornaliero);
  };

  const resetMonitoraggio = () => {
    setMonitorStartDate(null);
    setMonitorStartSaldo(null);
    setMonitorStartBudget(null);
    setShowResetMonitorConfirm(false);
  };

  const exportData = () => {
    const now = new Date();
    const backupDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");

    const data = {
      saldo,
      chebanca,
      revolut,
      targetDate,
      minimo,
      lastUpdate,
      monitorStartDate,
      monitorStartSaldo,
      monitorStartBudget
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `budgetApp-${backupDate}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        setSaldo(parsed.saldo || 0);
        setChebanca(parsed.chebanca || 0);
        setRevolut(parsed.revolut || 0);
        setTargetDate(parsed.targetDate || "");
        setMinimo(parsed.minimo || 0);
        setLastUpdate(parsed.lastUpdate || null);
        setMonitorStartDate(parsed.monitorStartDate || null);
        setMonitorStartSaldo(parsed.monitorStartSaldo ?? null);
        setMonitorStartBudget(parsed.monitorStartBudget ?? null);

        alert("Backup importato correttamente");
      } catch (err) {
        console.error(err);
        alert("Errore durante import backup");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const accountCards = [
    {
      label: "CheBanca",
      value: chebanca,
      setter: setChebanca,
      logoClass: "w-[4.25rem] h-12"
    },
    {
      label: "Revolut",
      value: revolut,
      setter: setRevolut,
      logoClass: "w-12 h-12"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-100 px-4 pb-4 text-zinc-900 flex justify-center pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="w-full max-w-md pb-20">
        <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-3xl p-5 shadow-sm mb-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Budget Giornaliero
          </h1>

          <div className="mt-5">
            <div className="bg-green-100 border border-green-200 rounded-2xl p-3">
              <p className="text-xs font-medium text-green-700">
                Saldo attuale
              </p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatEuro(saldoCalcolato)}
              </p>
              <p className="text-[11px] text-green-700 mt-1">
                Aggiornato al {formatLastUpdate(lastUpdate)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {accountCards.map((account) => (
            <div
              key={account.label}
              className="rounded-2xl border border-white/60 bg-white/75 p-3 shadow-sm"
            >
              <div className="flex items-center justify-end min-h-12">
                <span className="sr-only">{account.label}</span>
                <img
                  src={`/accounts/${account.label}.png`}
                  alt={account.label}
                  className={`object-contain shrink-0 ${account.logoClass}`}
                />
              </div>

              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                <label className="sr-only">{account.label}</label>
                <MoneyInput
                  onValueChange={account.setter}
                  value={account.value}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={confermaSaldo}
          className="w-full h-12 mt-3 rounded-2xl bg-red-600 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
          type="button"
        >
          Conferma saldo
        </button>

        <div className="mt-3 rounded-3xl border border-white/50 bg-white/70 p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Impostazioni budget</h2>
              <p className="text-xs text-zinc-500">
                Data stipendio e riserva desiderata
              </p>
            </div>

            <button
              className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold active:scale-95 transition-transform ${
                settingsEditable
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-700 border border-zinc-200"
              }`}
              onClick={() => setSettingsEditable((current) => !current)}
              type="button"
            >
              {settingsEditable ? "Salva" : "Modifica"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/60 bg-white/75 p-3 shadow-sm">
              <label className="text-sm font-semibold">Data stipendio</label>
              <input
                className="mt-3 w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-base outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                disabled={!settingsEditable}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ fontSize: "16px" }}
                type="date"
                value={targetDate}
              />
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/75 p-3 shadow-sm">
              <label className="text-sm font-semibold">Riserva desiderata</label>
              <div
                className={`mt-3 rounded-2xl border border-zinc-200 px-3 py-3 ${
                  settingsEditable ? "bg-white" : "bg-zinc-100"
                }`}
              >
                <MoneyInput
                  disabled={!settingsEditable}
                  onValueChange={setMinimo}
                  value={minimo}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-2xl bg-green-50 border border-green-100 p-3">
            <p className="text-xs font-semibold text-green-700">
              Budget netto
            </p>
            <p className="mt-1 text-lg font-bold text-green-900">
              {formatEuro(budgetMensileNettoRiserva)}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs font-semibold text-blue-700">
              Giorni
            </p>
            <p className="mt-1 text-lg font-bold text-blue-900">
              {giorniRestanti}
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 border border-purple-100 p-3">
            <p className="text-xs font-semibold text-purple-700">
              Giornaliero
            </p>
            <p className="mt-1 text-lg font-bold text-purple-900">
              {formatEuro(budgetGiornaliero)}
            </p>
          </div>
        </div>

        <div className="mt-6 bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Monitoraggio</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Traccia i progressi rispetto al budget giornaliero
              </p>
            </div>

            {monitorStartDate ? (
              <button
                onClick={() => setShowResetMonitorConfirm(true)}
                className="h-11 shrink-0 px-4 rounded-2xl bg-zinc-200 text-zinc-700 text-sm font-semibold active:scale-95 transition-transform shadow-sm"
                type="button"
              >
                Reset
              </button>
            ) : (
              <button
                onClick={iniziaMonitoraggio}
                className="h-11 shrink-0 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-transform shadow-sm"
                type="button"
              >
                Avvia
              </button>
            )}
          </div>

          <div
            className={`rounded-2xl border p-4 text-center text-sm font-semibold ${andamentoClassName}`}
          >
            {andamentoText}
          </div>

          {monitorStartDate && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Avviato il {monitorStartDate} con budget giornaliero{" "}
              {formatEuro(monitorStartBudget)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={exportData}
            className="h-12 rounded-2xl bg-green-600 text-white font-semibold active:scale-[0.98] transition-transform shadow-sm"
            type="button"
          >
            Esporta Backup
          </button>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={importData}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-2xl bg-red-600 text-white font-semibold active:scale-[0.98] transition-transform shadow-sm"
              type="button"
            >
              Importa Backup
            </button>
          </div>
        </div>

        {showResetMonitorConfirm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-semibold">Reset monitoraggio</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Vuoi azzerare il monitoraggio attivo? Saldo, conti, data
                stipendio e riserva resteranno invariati.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  className="h-12 rounded-2xl bg-zinc-200 text-zinc-700 font-semibold active:scale-[0.98] transition-transform"
                  onClick={() => setShowResetMonitorConfirm(false)}
                  type="button"
                >
                  Annulla
                </button>

                <button
                  className="h-12 rounded-2xl bg-red-600 text-white font-semibold active:scale-[0.98] transition-transform"
                  onClick={resetMonitoraggio}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

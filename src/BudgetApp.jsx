import { useState, useMemo, useEffect, useRef } from "react";

// VERSIONE STABILE: 2.1
// BREAKPOINT DI RIPRISTINO - NON MODIFICARE SENZA NUOVA VERSIONE
export default function BudgetApp() {
  const [saldo, setSaldo] = useState(0);
  const [chebanca, setChebanca] = useState(0);
  const [revolut, setRevolut] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [minimo, setMinimo] = useState(0);
  const [storico, setStorico] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fileInputRef = useRef(null);

  const [swipe, setSwipe] = useState({ index: null, x: 0, startX: 0 });

  const formatEuro = (val) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val || 0);

  const saldoCalcolato = useMemo(() => {
    return Number(chebanca || 0) + Number(revolut || 0);
  }, [chebanca, revolut]);

  useEffect(() => {
    const saved = localStorage.getItem("budget-data");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSaldo(parsed.saldo || 0);
      setChebanca(parsed.chebanca || 0);
      setRevolut(parsed.revolut || 0);
      setTargetDate(parsed.targetDate || "");
      setMinimo(parsed.minimo || 0);
      setStorico(parsed.storico || []);
      setLastUpdate(parsed.lastUpdate || null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "budget-data",
      JSON.stringify({ saldo, chebanca, revolut, targetDate, minimo, storico, lastUpdate })
    );
  }, [saldo, chebanca, revolut, targetDate, minimo, storico, lastUpdate]);

  // FIX formato timestamp
  const formatTimestamp = (date) => {
    const d = new Date(date);
    const pad = (n) => n.toString().padStart(2, "0");

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const confermaSaldo = () => {
    const now = new Date();
    const timestamp = formatTimestamp(now);

    setSaldo(saldoCalcolato);
    setLastUpdate(timestamp);

    const nuovoStorico = [
      ...storico,
      { data: timestamp, raw: Date.now(), saldo: saldoCalcolato }
    ];
    setStorico(nuovoStorico);
  };

  const exportData = () => {
    const data = { saldo, chebanca, revolut, targetDate, minimo, storico, lastUpdate };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-budget-${new Date().toISOString().slice(0, 10)}.json`;
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

        const map = new Map();
        storico.forEach((i) => map.set(i.data, i));
        (parsed.storico || []).forEach((i) => map.set(i.data, i));

        const merged = Array.from(map.values()).sort((a, b) => {
          if (a.raw && b.raw) return a.raw - b.raw;
          return new Date(a.data) - new Date(b.data);
        });

        setStorico(merged);
        setSaldo(parsed.saldo || saldo);
        setChebanca(parsed.chebanca || chebanca);
        setRevolut(parsed.revolut || revolut);
        setTargetDate(parsed.targetDate || targetDate);
        setMinimo(parsed.minimo || minimo);
        setLastUpdate(parsed.lastUpdate || lastUpdate);

        alert("Backup unito correttamente");
      } catch {
        alert("Errore durante l'import");
      }
    };

    reader.readAsText(file);
  };

  const rimuoviVoceStorico = (index) => {
    const updated = [...storico];
    updated.splice(index, 1);
    setStorico(updated);

    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleTouchStart = (e, index) => {
    setSwipe({ index, x: 0, startX: e.touches[0].clientX });
  };

  const handleTouchMove = (e) => {
    if (swipe.index === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipe.startX;

    if (diff < 0) {
      setSwipe((prev) => ({ ...prev, x: Math.max(diff, -120) }));
    }
  };

  const handleTouchEnd = (index) => {
    if (swipe.x < -80) {
      rimuoviVoceStorico(index);
    }
    setSwipe({ index: null, x: 0, startX: 0 });
  };

  const giorniRestanti = useMemo(() => {
    if (!targetDate) return 0;
    const oggi = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target - oggi) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [targetDate]);

  const budgetGiornaliero = useMemo(() => {
    if (giorniRestanti === 0) return 0;
    return (saldo - minimo) / giorniRestanti;
  }, [saldo, minimo, giorniRestanti]);

  const previsione = useMemo(() => {
    if (giorniRestanti === 0) return saldo;
    return saldo - budgetGiornaliero * giorniRestanti;
  }, [saldo, budgetGiornaliero, giorniRestanti]);

  const scostamento = useMemo(() => previsione - minimo, [previsione, minimo]);

  const percentuale = useMemo(() => {
    if (minimo === 0) return 0;
    return (scostamento / minimo) * 100;
  }, [scostamento, minimo]);

  const statoClasse =
    scostamento >= 0
      ? "text-green-600"
      : percentuale >= -25
      ? "text-orange-500"
      : "text-red-600";

  const speseGiornaliere = useMemo(() => {
    if (storico.length < 2) return [];

    const res = [];
    for (let i = 1; i < storico.length; i++) {
      const prev = storico[i - 1];
      const curr = storico[i];
      const spesa = prev.saldo - curr.saldo;

      res.push({
        data: curr.data,
        spesa,
        index: i
      });
    }
    return res;
  }, [storico]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-center">Controllo budget giornaliero</h1>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">CheBanca</label>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="decimal"
                value={chebanca}
                onChange={(e) => setChebanca(e.target.value)}
                className="w-full p-2 pr-8 border rounded"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Revolut</label>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="decimal"
                value={revolut}
                onChange={(e) => setRevolut(e.target.value)}
                className="w-full p-2 pr-8 border rounded"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
          </div>
        </div>

        <div className="p-2 border rounded bg-gray-50 font-semibold text-center">
          {formatEuro(saldoCalcolato)}
        </div>

        <button onClick={confermaSaldo} className="w-full p-2 bg-black text-white rounded">
          Conferma saldo
        </button>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Data Stipendio</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full p-2 border rounded mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Riserva in € al {targetDate ? new Date(targetDate).toLocaleDateString("it-IT") : "data stipendio"}
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="decimal"
                value={minimo}
                onChange={(e) => setMinimo(Number(e.target.value))}
                className="w-full p-2 pr-8 border rounded"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p>
            Giorni restanti: <strong>{giorniRestanti}</strong>
          </p>
          <p>
            Budget giornaliero: <strong className={statoClasse}>{formatEuro(budgetGiornaliero)}</strong>
          </p>
          <p>
            Previsione Saldo al {targetDate ? new Date(targetDate).toLocaleDateString("it-IT") : "data stipendio"}:
            <strong className={statoClasse}> {formatEuro(previsione)}</strong>
          </p>
          <p className={`${statoClasse} text-sm font-semibold`}>
            {scostamento >= 0
              ? `+${formatEuro(scostamento)} sopra la riserva`
              : `-${formatEuro(Math.abs(scostamento))} sotto la riserva`}
          </p>
        </div>

        {speseGiornaliere.length > 0 && (
          <div className="pt-4">
            <h2 className="font-semibold mb-2">Storico spese</h2>
            <div className="space-y-2 text-sm">
              {[...speseGiornaliere].reverse().map((s, idx) => {
                const realIndex = speseGiornaliere.length - 1 - idx;
                return (
                  <div
                    key={realIndex}
                    onTouchStart={(e) => handleTouchStart(e, realIndex)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(realIndex)}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 text-white font-bold">
                      elimina
                    </div>

                    <div
                      className="relative z-10 flex justify-between items-center p-2 bg-white transition-transform duration-150"
                      style={{
                        transform:
                          swipe.index === realIndex
                            ? `translateX(${swipe.x}px)`
                            : "translateX(0px)"
                      }}
                    >
                      <span>{s.data?.replace(/-/g, "/")}</span>

                      <span className={`${s.spesa >= 0 ? "text-red-600" : "text-green-600"} font-semibold`}>
                        {`${s.spesa >= 0 ? "-" : "+"}${formatEuro(Math.abs(s.spesa))}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full p-2 bg-gray-700 text-white rounded"
          >
            Importa backup
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={importData}
            className="hidden"
          />

          <button
            onClick={exportData}
            className="w-full p-2 bg-blue-600 text-white rounded"
          >
            Esporta backup
          </button>
        </div>
      </div>
    </div>
  );
}

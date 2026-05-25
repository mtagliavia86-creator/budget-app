import React, { useState, useMemo, useEffect, useRef } from "react";

// VERSIONE STABILE: 4.5 GM
export default function BudgetApp() {
  const [saldo, setSaldo] = useState(0);
  const [chebanca, setChebanca] = useState(0);
  const [revolut, setRevolut] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [minimo, setMinimo] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [budgetCarry, setBudgetCarry] = useState(0);
  const [movimenti, setMovimenti] = useState([]);
  const [movimentiAperti, setMovimentiAperti] = useState(false);
  const fileInputRef = useRef(null);

  

  useEffect(() => {
    const saved = localStorage.getItem("budget-data");

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      setSaldo(parsed.saldo || 0);
      setChebanca(parsed.chebanca || 0);
      setRevolut(parsed.revolut || 0);
      setTargetDate(parsed.targetDate || "");
      setMinimo(parsed.minimo || 0);
      setLastUpdate(parsed.lastUpdate || null);
      setBudgetCarry(parsed.budgetCarry || 0);
      setMovimenti(parsed.movimenti || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "budget-data",
      JSON.stringify({
        saldo,
        chebanca,
        revolut,
        targetDate,
        minimo,
        lastUpdate,
        budgetCarry,
        movimenti
      })
    );
  }, [
    saldo,
    chebanca,
    revolut,
    targetDate,
    minimo,
    lastUpdate,
    budgetCarry,
    movimenti
  ]);

  const formatEuro = (value) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(Number(value || 0));
  };

  const formatTimestamp = (date) => {
    const d = new Date(date);

    const pad = (n) => String(n).padStart(2, "0");

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const saldoCalcolato = useMemo(() => {
    return Number(chebanca || 0) + Number(revolut || 0);
  }, [chebanca, revolut]);

  const giorniRestanti = useMemo(() => {
    if (!targetDate) return 0;

    const oggi = new Date();
    const stipendio = new Date(targetDate);

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

  const recuperoGiornaliero = useMemo(() => {
    if (giorniRestanti <= 0) return 0;

    return budgetCarry / giorniRestanti;
  }, [budgetCarry, giorniRestanti]);

  const budgetCorretto = useMemo(() => {
    return budgetGiornaliero + recuperoGiornaliero;
  }, [budgetGiornaliero, recuperoGiornaliero]);

  const rapportoBudget = useMemo(() => {
    if (budgetGiornaliero <= 0) return 0;

    return (budgetCorretto / budgetGiornaliero) * 100;
  }, [budgetCorretto, budgetGiornaliero]);

  const statoClasse =
    rapportoBudget >= 80
      ? "text-green-600"
      : rapportoBudget >= 50
      ? "text-orange-500"
      : "text-red-600";

  const confermaSaldo = () => {
    const now = new Date();
    const timestamp = formatTimestamp(now);

    // Prima inizializzazione: nessun tracking
    if (!lastUpdate || saldo === 0) {
      setSaldo(saldoCalcolato);
      setLastUpdate(timestamp);
      return;
    }

    const lastDateParts = lastUpdate.split("/");

    const lastDate = new Date(
      Number(lastDateParts[2]),
      Number(lastDateParts[1]) - 1,
      Number(lastDateParts[0])
    );

    const giorniPassati = Math.max(
      1,
      Math.ceil((now - lastDate) / 86400000)
    );

    const spesaReale = saldo - saldoCalcolato;

    // Budget teorico disponibile per i giorni trascorsi
    const budgetDisponibile = budgetGiornaliero * giorniPassati;

    const delta = budgetDisponibile - spesaReale;

    setBudgetCarry((prev) => prev + delta);

    const nuovoMovimento = {
      id: Date.now(),
      data: timestamp,
      giorniPassati,
      saldoPrecedente: saldo,
      saldoNuovo: saldoCalcolato,
      spesa: spesaReale,
      delta
    };

    setMovimenti((prev) => [nuovoMovimento, ...prev]);

    setSaldo(saldoCalcolato);
    setLastUpdate(timestamp);
  };

  const toggleMovimenti = () => {
    setMovimentiAperti((prev) => !prev);
  };

  const exportData = () => {
    const data = {
      saldo,
      chebanca,
      revolut,
      targetDate,
      minimo,
      lastUpdate,
      budgetCarry,
      movimenti
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `budget-backup-${Date.now()}.json`;

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
        setBudgetCarry(parsed.budgetCarry || 0);
        setMovimenti(parsed.movimenti || []);

        alert("Backup importato correttamente");
      } catch (err) {
        console.error(err);
        alert("Errore durante import backup");
      }
    };

    reader.readAsText(file);
  };

  const resetDati = () => {
    localStorage.removeItem("budget-data");

    setSaldo(0);
    setChebanca(0);
    setRevolut(0);
    setTargetDate("");
    setMinimo(0);
    setLastUpdate(null);
    setBudgetCarry(0);
    setMovimenti([]);
    setMovimentiAperti(false);

    window.location.reload();
  };

  const eliminaMovimento = (id) => {
    const movimento = movimenti.find((m) => m.id === id);

    if (!movimento) return;

    const conferma = window.confirm(
      "Vuoi eliminare definitivamente questo movimento?"
    );

    if (!conferma) return;

    setBudgetCarry((prev) => prev - movimento.delta);
    setMovimenti((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-center">
          Controllo budget giornaliero
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {["CheBanca", "Revolut"].map((label, index) => {
            const value = index === 0 ? chebanca : revolut;
            const setter = index === 0 ? setChebanca : setRevolut;

            return (
              <div key={label}>
                <label className="text-sm font-medium">{label}</label>

                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9.]/g, "");
                      setter(clean === "" ? 0 : Number(clean));
                    }}
                    className="w-full p-2 pr-8 border rounded"
                  />

                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                    €
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2 border rounded bg-gray-50 font-semibold text-center space-y-1">
          <div className="text-xs text-gray-500">
            Saldo al {lastUpdate || "--/--/----"}
          </div>

          <div>{formatEuro(saldoCalcolato)}</div>
        </div><button
          onClick={confermaSaldo}
          className="w-full p-2 bg-black text-white rounded"
        >
          Conferma saldo
        </button>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Data stipendio</label>

            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full p-2 border rounded mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Riserva desiderata al{" "}
              {targetDate
                ? new Date(targetDate).toLocaleDateString("it-IT")
                : "data stipendio"}
            </label>

            <div className="relative mt-1">
              <input
                type="text"
                inputMode="decimal"
                value={minimo}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9.]/g, "");
                  setMinimo(clean === "" ? 0 : Number(clean));
                }}
                className="w-full p-2 pr-8 border rounded"
              />

              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                €
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p>
            Budget mensile al netto della riserva:{" "}
            <strong>{formatEuro(budgetMensileNettoRiserva)}</strong>
          </p>

          <p>
            Giorni restanti: <strong>{giorniRestanti}</strong>
          </p>

          <p>
            Budget giornaliero con riserva:{" "}
            <strong className={statoClasse}>
              {formatEuro(budgetCorretto)}
            </strong>
          </p>

          <div>
            {budgetCarry > 0 && (
              <span className="text-green-600">
                Margine accumulato: {formatEuro(budgetCarry)}
              </span>
            )}

            {budgetCarry < 0 && (
              <div>
                Recupero necessario: {" "}
                <strong className={statoClasse}>
                  {formatEuro(Math.abs(budgetCarry))}
                </strong>
              </div>
            )}

            {budgetCarry === 0 && (
              <span className="text-gray-500">
                Budget perfettamente in linea
              </span>
            )}
          </div>
        </div>

        {movimenti.length > 0 ? (
          <div className="space-y-2 pt-2 border-t">
            <button
              onClick={toggleMovimenti}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
            >
              <span>Movimenti registrati ({movimenti.length})</span>
              <span>{movimentiAperti ? "▲" : "▼"}</span>
            </button>

            {movimentiAperti && (
              <div className="space-y-2 pt-2">
                {movimenti.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-gray-50"
                  >
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{m.data}</div>

                      <div className="text-gray-500 text-xs">
                        Spesa: {formatEuro(m.spesa)}
                      </div>

                      <div className="text-gray-400 text-xs">
                        Giorni trascorsi: {m.giorniPassati || 1}
                      </div>

                      <div
                        className={`text-xs font-medium ${
                          m.delta >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {m.delta >= 0
                          ? `+${formatEuro(m.delta)} in positivo`
                          : `${formatEuro(Math.abs(m.delta))} da recuperare`}
                      </div>
                    </div>

                    <button
                      onClick={() => eliminaMovimento(m.id)}
                      className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                      <span className="text-sm">🗑</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={exportData}
                className="p-2 rounded bg-black text-white text-sm"
              >
                Esporta
              </button>

              <button
                onClick={() => fileInputRef.current.click()}
                className="p-2 rounded bg-gray-700 text-white text-sm"
              >
                Importa
              </button>
            </div>

            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={importData}
              className="hidden"
            />

            <button
              onClick={resetDati}
              className="w-full p-2 rounded bg-red-500 text-white text-sm"
            >
              Pulisci dati
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportData}
                className="p-2 rounded bg-black text-white text-sm"
              >
                Esporta
              </button>

              <button
                onClick={() => fileInputRef.current.click()}
                className="p-2 rounded bg-gray-700 text-white text-sm"
              >
                Importa
              </button>
            </div>

            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={importData}
              className="hidden"
            />

            <button
              onClick={resetDati}
              className="w-full p-2 rounded bg-red-500 text-white text-sm"
            >
              Pulisci dati
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

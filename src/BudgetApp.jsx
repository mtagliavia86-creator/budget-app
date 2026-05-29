import React, { useState, useMemo, useEffect, useRef } from "react";

// VERSIONE STABILE: 4.7 GM
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

      setMonitorStartDate(parsed.monitorStartDate || null);
      setMonitorStartSaldo(parsed.monitorStartSaldo ?? null);
      setMonitorStartBudget(parsed.monitorStartBudget ?? null);
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

  const formatEuro = (value) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(Number(value || 0));

  const formatDate = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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

  const confermaSaldo = () => {
    const timestamp = formatDate(new Date());
    setSaldo(saldoCalcolato);
    setLastUpdate(timestamp);
  };

  const iniziaMonitoraggio = () => {
    const timestamp = formatDate(new Date());

    setMonitorStartDate(timestamp);
    setMonitorStartSaldo(saldoCalcolato);
    setMonitorStartBudget(budgetGiornaliero);
  };

  const exportData = () => {
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
  };

  const getPallinoClass = () => {
    if (!andamento) return "bg-gray-400";
    if (andamento.stato === "green") return "bg-green-500";
    if (andamento.stato === "orange") return "bg-orange-500";
    if (andamento.stato === "red") return "bg-red-500";
    return "bg-gray-400";
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
        </div>

        <button
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
            <strong>{formatEuro(budgetGiornaliero)}</strong>
          </p>
        </div>

        <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
          <button
            onClick={iniziaMonitoraggio}
            className="w-full p-2 bg-gray-900 text-white rounded"
          >
            🎯 Inizia monitoraggio
          </button>

          {monitorStartDate && (
            <div className="text-xs text-gray-500 text-center">
              Monitoraggio dal {monitorStartDate}
            </div>
          )}

          {andamento && (
            <div className="flex items-start gap-2 text-sm">
              <span
                className={`mt-1 inline-block h-3 w-3 rounded-full ${getPallinoClass()}`}
              />

              <span>
                {andamento.stato === "neutral" ? (
                  "Monitoraggio avviato oggi"
                ) : andamento.differenza >= 0 ? (
                  <>
                    {formatEuro(andamento.differenza)} sotto il budget previsto
                  </>
                ) : (
                  <>
                    {formatEuro(Math.abs(andamento.differenza))} sopra il budget
                    previsto
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
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
      </div>
    </div>
  );
}

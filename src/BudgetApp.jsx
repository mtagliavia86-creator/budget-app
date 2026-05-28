import React, { useState, useMemo, useEffect } from "react";

// VERSIONE STABILE: 4.5 GM
export default function BudgetApp() {
  const [saldo, setSaldo] = useState(0);
  const [chebanca, setChebanca] = useState(0);
  const [revolut, setRevolut] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [minimo, setMinimo] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);

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
        lastUpdate
      })
    );
  }, [saldo, chebanca, revolut, targetDate, minimo, lastUpdate]);

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

  const confermaSaldo = () => {
    const timestamp = formatTimestamp(new Date());

    setSaldo(saldoCalcolato);
    setLastUpdate(timestamp);
  };

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
      </div>
    </div>
  );
}

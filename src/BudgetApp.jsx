import React, { useEffect, useMemo, useState } from "react";

type Medication = {
  id: string;
  name: string;
  initialPills: number;
  pillsPerDose: number;
  dosesPerDay: number;
  doseTimes: string[];
  lowThreshold: number;
  startDate: string;
};

const STORAGE_KEY = "my-therapy-v1";

function createId() {
  return Math.random().toString(36).slice(2, 9);
}

function getConsumedPills(med: Medication) {
  if (!med.startDate) return 0;

  const start = new Date(med.startDate);
  const now = new Date();

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let consumed = 0;
  const cursor = new Date(start);

  while (cursor <= now) {
    med.doseTimes.forEach((time) => {
      const [hours, minutes] = time
        .split(":")
        .map(Number);

      const doseDate = new Date(cursor);

      doseDate.setHours(hours || 0, minutes || 0, 0, 0);

      if (doseDate >= start && doseDate <= now) {
        consumed += med.pillsPerDose;
      }
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return consumed;
}

function getCurrentPills(med: Medication) {
  return Math.max(0, med.initialPills - getConsumedPills(med));
}

function getDaysLeft(med: Medication) {
  const dailyConsumption = med.pillsPerDose * med.dosesPerDay;

  if (dailyConsumption <= 0) {
    return 0;
  }

  return Math.ceil(getCurrentPills(med) / dailyConsumption);
}

function getRefillDate(daysLeft: number) {
  const date = new Date();

  date.setDate(date.getDate() + daysLeft);

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function App() {
  const [medications, setMedications] = useState<Medication[]>([]);

  const [pendingDelete, setPendingDelete] = useState<Medication | null>(null);
  const [pendingRefill, setPendingRefill] = useState<Medication | null>(null);
  const [pendingEdit, setPendingEdit] = useState<Medication | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [refillAmount, setRefillAmount] = useState(0);

  const [form, setForm] = useState({
    name: "",
    initialPills: "",
    pillsPerDose: "",
    dosesPerDay: "",
    doseTimes: [""],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) return;

      setMedications(parsed);
    } catch {
      setMedications([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medications));
  }, [medications]);

  const sortedMedications = useMemo(() => {
    return [...medications].sort(
      (a, b) => getDaysLeft(a) - getDaysLeft(b)
    );
  }, [medications]);

  function addMedication() {
    if (!form.name.trim()) return;

    setMedications((prev) => [
      ...prev,
      {
        id: createId(),
        name: form.name,
        initialPills: Number(form.initialPills || 0),
        pillsPerDose: Number(form.pillsPerDose || 1),
        dosesPerDay: Number(form.dosesPerDay || 1),
        doseTimes: form.doseTimes,
        lowThreshold: 5,
        startDate: new Date().toISOString(),
      },
    ]);

    setForm({
      name: "",
      initialPills: "",
      pillsPerDose: "",
      dosesPerDay: "",
      doseTimes: [""],
    });

    setShowAddModal(false);
  }

  function updateMedication(updated: Medication) {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === updated.id ? updated : med
      )
    );

    setPendingEdit(null);
  }

  function refillMedication(id: string, amount: number) {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === id
          ? {
              ...med,
              initialPills: amount,
              startDate: new Date().toISOString(),
            }
          : med
      )
    );

    setPendingRefill(null);
  }

  function removeMedication(id: string) {
    setMedications((prev) =>
      prev.filter((med) => med.id !== id)
    );

    setPendingDelete(null);
  }

  function exportData() {
    const blob = new Blob([
      JSON.stringify(medications, null, 2),
    ]);

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "my-therapy-backup.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importData(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string);

        if (!Array.isArray(imported)) {
          throw new Error();
        }

        setMedications(imported);
      } catch {
        alert("Backup non valido");
      }
    };

    reader.readAsText(file);
  }

  return (
    <>
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold">
              Elimina farmaco
            </h2>

            <p className="mt-3 text-sm text-slate-600">
              Sei sicura di voler eliminare
              <span className="font-semibold text-slate-900">
                {" "}
                {pendingDelete.name}
              </span>
              ?
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-2xl bg-slate-200 py-3 font-semibold"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={() => removeMedication(pendingDelete.id)}
                className="rounded-2xl bg-red-500 py-3 font-semibold text-white"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRefill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold">
              Refill farmaco
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Inserisci il quantitativo attuale.
              La data e l'ora correnti verranno salvate
              per il ricalcolo automatico.
            </p>

            <input
              type="number"
              inputMode="numeric"
              placeholder="Nuovo quantitativo attuale"
              value={refillAmount}
              onChange={(e) => setRefillAmount(Number(e.target.value))}
              className="mt-4 w-full rounded-2xl bg-slate-200 px-4 py-3 text-base outline-none"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingRefill(null)}
                className="rounded-2xl bg-slate-200 py-3 font-semibold"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={() =>
                  refillMedication(pendingRefill.id, refillAmount)
                }
                className="rounded-2xl bg-emerald-500 py-3 font-semibold text-white"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto mt-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">
              Registra nuovo farmaco
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome farmaco"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              <input
                type="number"
                inputMode="numeric"
                placeholder="Pillole residue"
                value={form.initialPills}
                onChange={(e) =>
                  setForm({
                    ...form,
                    initialPills: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              <input
                type="number"
                inputMode="numeric"
                placeholder="Pillole per dose"
                value={form.pillsPerDose}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pillsPerDose: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              <input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="Dosi al giorno"
                value={form.dosesPerDay}
                onChange={(e) => {
                  const doses = Math.max(1, Number(e.target.value));

                  setForm({
                    ...form,
                    dosesPerDay: doses,
                    doseTimes: Array.from(
                      { length: Number(doses || 0) },
                      (_, index) => form.doseTimes[index] || ""
                    ),
                  });
                }}
                className="w-full rounded-xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              {form.doseTimes.map((time, index) => (
                <input
                  key={index}
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const updated = [...form.doseTimes];
                    updated[index] = e.target.value;

                    setForm({
                      ...form,
                      doseTimes: updated,
                    });
                  }}
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 text-base outline-none"
                />
              ))}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl bg-slate-200 py-3 font-semibold"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={addMedication}
                  className="rounded-2xl bg-blue-500 py-3 font-semibold text-white"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto mt-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">
              Modifica farmaco
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome farmaco"
                value={pendingEdit.name}
                onChange={(e) =>
                  setPendingEdit({
                    ...pendingEdit,
                    name: e.target.value,
                  })
                }
                className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                Pillole attuali: {getCurrentPills(pendingEdit)}
              </div>

              <input
                type="number"
                inputMode="numeric"
                placeholder="Pillole per dose"
                value={pendingEdit.pillsPerDose}
                onChange={(e) =>
                  setPendingEdit({
                    ...pendingEdit,
                    pillsPerDose:
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                  })
                }
                className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              <input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="Dosi al giorno"
                value={pendingEdit.dosesPerDay}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  const doses =
                    rawValue === ""
                      ? ""
                      : Math.max(1, Number(rawValue));

                  setPendingEdit({
                    ...pendingEdit,
                    dosesPerDay: doses,
                    doseTimes: Array.from(
                      { length: doses },
                      (_, index) =>
                        pendingEdit.doseTimes[index] || "08:00"
                    ),
                  });
                }}
                className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-base outline-none"
              />

              {pendingEdit.doseTimes.map((time, index) => (
                <input
                  key={index}
                  type="time"
                  placeholder="Orario assunzione"
                  value={time}
                  onChange={(e) => {
                    const updated = [...pendingEdit.doseTimes];

                    updated[index] = e.target.value;

                    setPendingEdit({
                      ...pendingEdit,
                      doseTimes: updated,
                    });
                  }}
                  className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-base outline-none"
                />
              ))}

              <button
                type="button"
                onClick={() => updateMedication(pendingEdit)}
                className="w-full rounded-2xl bg-blue-500 py-3 font-semibold text-white"
              >
                Salva modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-amber-100 to-cyan-100 p-4 text-slate-900">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
          <div className="absolute -left-4 top-4 text-7xl rotate-12">🍬</div>
          <div className="absolute right-2 top-16 text-8xl -rotate-6">🧁</div>
          <div className="absolute left-8 top-1/4 text-7xl rotate-6">🍭</div>
          <div className="absolute right-4 top-[38%] text-8xl -rotate-12">🍩</div>
          <div className="absolute left-4 top-[55%] text-7xl rotate-12">🍫</div>
          <div className="absolute right-8 top-[68%] text-8xl -rotate-6">🍪</div>
        </div>

        <div className="relative mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h1 className="inline-block rounded-3xl bg-gradient-to-r from-pink-300 via-fuchsia-300 to-cyan-300 px-5 py-2 text-3xl font-bold tracking-wide text-white shadow-lg shadow-pink-200/60">
              Gaya's Therapy
            </h1>
          </div>

          <div className="space-y-4">
            {sortedMedications.map((med) => {
              const currentPills = getCurrentPills(med);
              const daysLeft = getDaysLeft(med);
              const refillDate = getRefillDate(daysLeft);

              return (
                <div
                  key={med.id}
                  className="rounded-2xl border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">
                        💊 {med.name}
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {med.pillsPerDose * med.dosesPerDay} {med.pillsPerDose * med.dosesPerDay === 1 ? "pillola al giorno" : "pillole al giorno"}
                      </p>

                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {med.doseTimes.map((time, index) => (
                          <span
                            key={index}
                            className="rounded-full border border-white/60 bg-white/70 px-2 py-0.5 text-[11px] text-slate-700 shadow-sm"
                          >
                            ⏰ {time}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPendingEdit(med)}
                        className="rounded-xl bg-blue-500 px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPendingRefill(med);
                          setRefillAmount(currentPills);
                        }}
                        className="rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        ↻
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingDelete(med)}
                        className="rounded-xl bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-300/80 bg-gradient-to-br from-white to-slate-100 p-2 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Rimaste
                      </div>

                      <div className="mt-0.5 text-lg font-bold">
                        {currentPills}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-300/80 bg-gradient-to-br from-white to-slate-100 p-2 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Copertura
                      </div>

                      <div className="mt-0.5 text-lg font-bold">
                        {daysLeft} {daysLeft === 1 ? "giorno" : "giorni"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-300/80 bg-gradient-to-br from-white to-slate-100 p-2 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Riacquisto
                      </div>

                      <div
                        className={`mt-0.5 text-xs font-bold ${
                          daysLeft <= 5
                            ? "text-red-500"
                            : "text-slate-900"
                        }`}
                      >
                        {refillDate}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 py-4 text-base font-bold text-white shadow-lg shadow-pink-200/60"
          >
            Registra nuovo farmaco
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={exportData}
              className="rounded-2xl bg-emerald-500 py-3 font-semibold text-white shadow-sm"
            >
              Esporta backup
            </button>

            <label className="flex cursor-pointer items-center justify-center rounded-2xl bg-blue-500 py-3 font-semibold text-white shadow-sm">
              Importa backup

              <input
                type="file"
                accept="application/json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react'

export default function SpeseMensiliApp() {
  const APP_VERSION = '7.0'
  const today = new Date()

  const [showModal, setShowModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [paidExpenses, setPaidExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('speseMensili-paidExpenses')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('speseMensili-expenses')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [currentMonth, setCurrentMonth] = useState(
    today.getMonth()
  )

  const [currentYear, setCurrentYear] = useState(
    today.getFullYear()
  )

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState(null)
  const [showIconPicker, setShowIconPicker] = useState(false)

  const fileInputRef = useRef(null)

  const availableIcons = [
    'amazon.png',
    'apple.png',
    'aruba.png',
    'enel.png',
    'google.png',
    'iliad.png',
    'now.png',
    'para.png',
    'prima.png',
    'vodafone.png',
    'youtube.png',
  ]

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    date: '',
    recurrence: 'Singola',
    icon: '',
  })

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

  const monthNames = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ]

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate()

  const month = `${monthNames[currentMonth]} ${currentYear}`

  const currentMonthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date)

    const expenseMonth = expenseDate.getMonth()
    const expenseYear = expenseDate.getFullYear()

    const validFrom = expense.validFrom
      ? new Date(expense.validFrom)
      : new Date(expense.date)

    const validUntil = expense.validUntil
      ? new Date(expense.validUntil)
      : null

    const currentMonthStart = new Date(
      currentYear,
      currentMonth,
      1
    )

    const validFromMonth = new Date(
      validFrom.getFullYear(),
      validFrom.getMonth(),
      1
    )

    if (currentMonthStart < validFromMonth) {
      return false
    }

    if (validUntil) {
      const validUntilMonth = new Date(
        validUntil.getFullYear(),
        validUntil.getMonth(),
        1
      )

      if (currentMonthStart > validUntilMonth) {
        return false
      }
    }

    if (expense.recurrence === 'Singola') {
      return (
        expenseMonth === currentMonth &&
        expenseYear === currentYear
      )
    }

    if (expense.recurrence === 'Mensile') {
      return (
        currentYear > expenseYear ||
        (currentYear === expenseYear &&
          currentMonth >= expenseMonth)
      )
    }

    if (expense.recurrence === 'Annuale') {
      return (
        currentMonth === expenseMonth &&
        currentYear >= expenseYear
      )
    }

    return false
  })

  const totalMonth = currentMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  const paidTotal = currentMonthExpenses
    .filter((expense) => paidExpenses.includes(expense.id))
    .reduce((sum, item) => sum + item.amount, 0)

  const unpaidTotal = totalMonth - paidTotal

  const getExpensesForDay = (day) => {
    return currentMonthExpenses.filter((expense) => {
      const expenseDay = new Date(expense.date).getDate()
      return expenseDay === day
    })
  }

  const selectedExpenses = selectedDay
    ? getExpensesForDay(selectedDay)
    : []

  const goToToday = () => {
    setSelectedDay(null)
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const changeMonth = (direction) => {
    setSelectedDay(null)

    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear((prev) => prev - 1)
      } else {
        setCurrentMonth((prev) => prev - 1)
      }
    }

    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear((prev) => prev + 1)
      } else {
        setCurrentMonth((prev) => prev + 1)
      }
    }
  }

  const openNewExpenseModal = () => {
    setEditingExpense(null)

    setNewExpense({
      title: '',
      amount: '',
      date: '',
      recurrence: 'Singola',
      icon: '',
    })

    setShowModal(true)
  }

  const startEditingExpense = (expense) => {
    setEditingExpense(expense)

    const expenseDay = new Date(expense.date).getDate()

    const currentOccurrenceDate = `${currentYear}-${String(
      currentMonth + 1
    ).padStart(2, '0')}-${String(expenseDay).padStart(2, '0')}`

    setNewExpense({
      title: expense.title,
      amount: expense.amount,
      date: currentOccurrenceDate,
      recurrence: expense.recurrence,
      icon: expense.icon || '',
    })

    setShowModal(true)
  }

  const applyRecurringEdit = (mode) => {
    if (!editingExpense || !pendingRecurringEdit) {
      return
    }

    const expenseDay = new Date(editingExpense.date).getDate()

    const currentOccurrenceDate = new Date(
      currentYear,
      currentMonth,
      expenseDay
    )

    const previousMonth = new Date(currentOccurrenceDate)
    previousMonth.setMonth(previousMonth.getMonth() - 1)

    const nextMonth = new Date(currentOccurrenceDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    if (mode === 'single') {
      setExpenses((prev) => {
        const updated = prev.map((item) => {
          if (item.id === editingExpense.id) {
            return {
              ...item,
              validUntil: previousMonth.toISOString(),
            }
          }

          return item
        })

        return updated.concat([
          {
            ...editingExpense,
            id: Date.now(),
            recurrence: 'Singola',
            title: pendingRecurringEdit.title,
            amount: Number(String(pendingRecurringEdit.amount).replace(',', '.')),
            date: pendingRecurringEdit.date,
            validFrom: pendingRecurringEdit.date,
            validUntil: pendingRecurringEdit.date,
          },
          {
            ...editingExpense,
            id: Date.now() + 1,
            title: editingExpense.title,
            amount: editingExpense.amount,
            date: editingExpense.date,
            recurrence: editingExpense.recurrence,
            validFrom: nextMonth.toISOString(),
          },
        ])
      })
    }

    if (mode === 'future') {
      setExpenses((prev) => {
        const updated = prev.map((item) => {
          if (item.id === editingExpense.id) {
            return {
              ...item,
              validUntil: previousMonth.toISOString(),
            }
          }

          return item
        })

        return updated.concat({
          ...editingExpense,
          id: Date.now(),
          title: pendingRecurringEdit.title,
          amount: Number(String(pendingRecurringEdit.amount).replace(',', '.')),
          date: pendingRecurringEdit.date,
          recurrence: pendingRecurringEdit.recurrence,
          icon: pendingRecurringEdit.icon,
          validFrom: currentOccurrenceDate.toISOString(),
        })
      })
    }

    setPendingRecurringEdit(null)
    setEditingExpense(null)
    setShowModal(false)
  }

  const saveExpense = () => {
    if (
      !newExpense.title ||
      !newExpense.amount ||
      !newExpense.date
    ) {
      return
    }

    if (editingExpense) {
      const isRecurring = editingExpense.recurrence !== 'Singola'

      if (isRecurring) {
        setPendingRecurringEdit({ ...newExpense })
        return
      }

      setExpenses((prev) =>
        prev.map((item) => {
          if (item.id === editingExpense.id) {
            return {
              ...item,
              title: newExpense.title,
              amount: Number(String(newExpense.amount).replace(',', '.')),
              date: newExpense.date,
              recurrence: newExpense.recurrence,
              icon: newExpense.icon,
              validFrom: newExpense.date,
            }
          }

          return item
        })
      )
    } else {
      const createdExpense = {
        id: Date.now(),
        seriesId: Date.now(),
        title: newExpense.title,
        amount: Number(String(newExpense.amount).replace(',', '.')),
        date: newExpense.date,
        recurrence: newExpense.recurrence,
        icon: newExpense.icon,
        validFrom: newExpense.date,
      }

      setExpenses((prev) => [...prev, createdExpense])
    }

    setNewExpense({
      title: '',
      amount: '',
      date: '',
      recurrence: 'Singola',
      icon: '',
    })

    setEditingExpense(null)
    setShowModal(false)
  }

  const deleteExpense = (expense, mode = 'single') => {
    const expenseDay = new Date(expense.date).getDate()

    const expenseDate = new Date(
      currentYear,
      currentMonth,
      expenseDay
    )

    const previousMonth = new Date(expenseDate)
    previousMonth.setMonth(previousMonth.getMonth() - 1)

    const nextMonth = new Date(expenseDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    if (mode === 'all') {
      setExpenses((prev) =>
        prev.filter((item) => item.seriesId !== expense.seriesId)
      )
    }

    if (mode === 'single') {
      setExpenses((prev) => {
        const updated = prev.map((item) => {
          if (item.id === expense.id) {
            return {
              ...item,
              validUntil: previousMonth.toISOString(),
            }
          }

          return item
        })

        return updated.concat({
          ...expense,
          id: Date.now(),
          validFrom: nextMonth.toISOString(),
        })
      })
    }

    if (mode === 'future') {
      setExpenses((prev) =>
        prev.map((item) => {
          if (item.id === expense.id) {
            return {
              ...item,
              validUntil: expenseDate.toISOString(),
            }
          }

          return item
        })
      )
    }

    if (mode === 'previous') {
      setExpenses((prev) =>
        prev.map((item) => {
          if (item.id === expense.id) {
            return {
              ...item,
              validFrom: expenseDate.toISOString(),
            }
          }

          return item
        })
      )
    }

    setPaidExpenses((prev) =>
      prev.filter((id) => id !== expense.id)
    )

    setDeleteTarget(null)
  }

  const exportBackup = () => {
    const backupData = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      expenses,
      paidExpenses,
    }

    const blob = new Blob(
      [JSON.stringify(backupData, null, 2)],
      {
        type: 'application/json',
      }
    )

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    const exportDate = new Date()

    const exportTimestamp = `${exportDate.getFullYear()}-${String(
      exportDate.getMonth() + 1
    ).padStart(2, '0')}-${String(
      exportDate.getDate()
    ).padStart(2, '0')}`

    link.download = `speseMensili-${exportTimestamp}.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const importBackup = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)

        if (!data.expenses || !data.paidExpenses) {
          alert('Backup non valido')
          return
        }

        setExpenses(data.expenses)
        setPaidExpenses(data.paidExpenses)
      } catch {
        alert('Errore durante importazione backup')
      }
    }

    reader.readAsText(file)
  }

  useEffect(() => {
    localStorage.setItem(
      'speseMensili-expenses',
      JSON.stringify(expenses)
    )
  }, [expenses])

  useEffect(() => {
    localStorage.setItem(
      'speseMensili-paidExpenses',
      JSON.stringify(paidExpenses)
    )
  }, [paidExpenses])

  const togglePaid = (expenseId) => {
    setPaidExpenses((prev) => {
      if (prev.includes(expenseId)) {
        return prev.filter((id) => id !== expenseId)
      }

      return [...prev, expenseId]
    })
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 p-4 flex justify-center">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-3xl p-5 shadow-sm mb-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Spese Mensili
          </h1>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => changeMonth('prev')}
                className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 text-lg font-semibold active:scale-95 transition-transform"
              >
                ←
              </button>

              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-zinc-600">
                  {month}
                </p>

                <button
                  onClick={goToToday}
                  className="h-9 px-4 rounded-full bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-transform shadow-sm"
                >
                  Oggi
                </button>
              </div>

              <button
                onClick={() => changeMonth('next')}
                className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 text-lg font-semibold active:scale-95 transition-transform"
              >
                →
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 mt-1">
              <div>
                <p className="text-4xl font-bold">
                  € {totalMonth.toFixed(2)}
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  Totale previsto del mese
                </p>
              </div>

              <button
                onClick={openNewExpenseModal}
                className="shrink-0 h-14 px-5 rounded-2xl bg-red-600 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
              >
                Nuova Spesa
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-green-100 border border-green-200 rounded-2xl p-3">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                  Pagato
                </p>

                <p className="text-2xl font-bold text-green-700 mt-1">
                  € {paidTotal.toFixed(2)}
                </p>
              </div>

              <div className="bg-red-100 border border-red-200 rounded-2xl p-3">
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
                  Da pagare
                </p>

                <p className="text-2xl font-bold text-red-700 mt-1">
                  € {unpaidTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({
            length: new Date(currentYear, currentMonth, 1).getDay(),
          }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dayExpenses = getExpensesForDay(day)

            const totalDay = dayExpenses.reduce(
              (sum, item) => sum + item.amount,
              0
            )

            const weekDay = new Date(
              currentYear,
              currentMonth,
              day
            ).getDay()

            const isToday =
              currentYear === today.getFullYear() &&
              currentMonth === today.getMonth() &&
              day === today.getDate()

            let bgClass = 'bg-green-50 border-green-100'

            const hasExpenses = dayExpenses.length > 0

            const allPaid =
              hasExpenses &&
              dayExpenses.every((expense) =>
                paidExpenses.includes(expense.id)
              )

            if (hasExpenses) {
              bgClass = allPaid
                ? 'bg-green-100 border-green-200'
                : 'bg-red-100 border-red-200'
            }

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl p-1.5 min-h-[58px] border shadow-sm text-left active:scale-[0.98] transition-transform ${bgClass} ${isToday ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
              >
                <div className="mb-1">
                  <p className="text-[8px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">
                    {weekDays[weekDay]}
                  </p>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">
                      {day}
                    </span>
                  </div>

                  {totalDay > 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-zinc-800 block leading-tight">
                        €{totalDay.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Spese del mese
              </h2>

              <p className="text-sm text-zinc-500 mt-1">
                {currentMonthExpenses.length} {currentMonthExpenses.length === 1 ? 'spesa prevista' : 'spese previste'}
              </p>
            </div>
          </div>

          <div className="space-y-2 pr-1">
            {currentMonthExpenses.length > 0 ? (
              [...currentMonthExpenses]
                .sort((a, b) => {
                  return (
                    new Date(a.date).getDate() -
                    new Date(b.date).getDate()
                  )
                })
                .map((expense) => {
                  const expenseDay = new Date(
                    expense.date
                  ).getDate()

                  const isPaid = paidExpenses.includes(expense.id)

                  return (
                    <div
                      key={`month-${expense.id}`}
                      className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${
                        isPaid
                          ? 'bg-green-100 border-green-200'
                          : 'bg-red-100 border-red-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-zinc-500 bg-white px-1.5 py-0.5 rounded-md border border-zinc-200 whitespace-nowrap">
                            {expenseDay} {monthNames[currentMonth].slice(0, 3)}
                          </span>

                          <div className="flex items-center gap-1.5 min-w-0">
                            {expense.icon && (
                              <img
                                src={`/icons/${expense.icon}`}
                                alt="Icona"
                                className="w-4 h-4 object-contain shrink-0"
                              />
                            )}

                            <p className="font-medium text-xs truncate">
                              {expense.title}
                            </p>
                          </div>

                          <p className="text-[10px] text-zinc-500 whitespace-nowrap">
                            ({expense.recurrence})
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p
                          className={`text-xs font-bold whitespace-nowrap ${
                            isPaid
                              ? 'text-green-700 line-through'
                              : 'text-zinc-900'
                          }`}
                        >
                          € {expense.amount}
                        </p>
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="bg-zinc-100 rounded-2xl p-5 text-center text-sm text-zinc-500 border border-zinc-200">
                Nessuna spesa presente nel mese
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 pb-24">
          <button
            onClick={exportBackup}
            className="h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-transform"
          >
            Esporta Backup
          </button>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={importBackup}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-2xl bg-zinc-200 text-zinc-800 font-semibold active:scale-[0.98] transition-transform"
            >
              Importa Backup
            </button>
          </div>
        </div>

        {selectedDay && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
            <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl max-h-[75vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-sm text-zinc-500">
                    Dettaglio giorno
                  </p>

                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-2xl font-semibold">
                      {selectedDay} {monthNames[currentMonth]}
                    </h2>

                    <button
                      onClick={() => {
                        setEditingExpense(null)

                        setNewExpense({
                          title: '',
                          amount: '',
                          date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
                          recurrence: 'Singola',
                        })

                        setShowModal(true)
                      }}
                      className="h-9 px-3 rounded-xl bg-red-600 text-white text-xs font-semibold shadow-sm active:scale-95 transition-transform"
                    >
                      Nuova Spesa
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-zinc-500 text-sm"
                >
                  Chiudi
                </button>
              </div>

              <div className="space-y-3">
                {selectedExpenses.length > 0 ? (
                  selectedExpenses.map((expense) => {
                    const isPaid = paidExpenses.includes(expense.id)

                    return (
                      <div
                        key={expense.id}
                        className={`rounded-xl px-3 py-2 border transition-all ${
                          isPaid
                            ? 'bg-green-100 border-green-300'
                            : 'bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              {expense.icon && (
                                <img
                                  src={`/icons/${expense.icon}`}
                                  alt="Icona"
                                  className="w-5 h-5 object-contain shrink-0"
                                />
                              )}

                              <p className="font-medium text-sm truncate">
                                {expense.title}
                              </p>
                            </div>

                            <p className="text-[10px] text-zinc-500">
                              {expense.recurrence}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <p
                              className={`text-sm font-bold whitespace-nowrap ${
                                isPaid
                                  ? 'text-green-700 line-through'
                                  : ''
                              }`}
                            >
                              € {expense.amount}
                            </p>

                            <button
                              onClick={() => togglePaid(expense.id)}
                              className="h-8 px-2 rounded-lg text-[10px] font-medium bg-green-600 text-white whitespace-nowrap"
                            >
                              {isPaid ? 'Pagata' : 'Paga'}
                            </button>

                            <button
                              onClick={() =>
                                startEditingExpense(expense)
                              }
                              className="h-8 px-2 rounded-lg text-[10px] font-medium bg-blue-100 text-blue-700 whitespace-nowrap"
                            >
                              Modifica
                            </button>

                            <button
                              onClick={() => {
                                if (expense.recurrence === 'Singola') {
                                  deleteExpense(expense)
                                } else {
                                  setDeleteTarget(expense)
                                }
                              }}
                              className="h-8 px-2 rounded-lg text-[10px] font-medium bg-red-100 text-red-700 whitespace-nowrap"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="bg-zinc-100 rounded-2xl p-6 text-center text-zinc-500 border border-zinc-200">
                    Nessuna spesa prevista
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {pendingRecurringEdit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] px-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
              <h3 className="text-lg font-semibold mb-2">
                Modifica ricorrenza
              </h3>

              <p className="text-sm text-zinc-600 leading-relaxed mb-5">
                Come vuoi modificare questa ricorrenza?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => applyRecurringEdit('single')}
                  className="w-full rounded-2xl bg-blue-600 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Solo questa
                </button>

                <button
                  onClick={() => applyRecurringEdit('future')}
                  className="w-full rounded-2xl bg-orange-500 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Questa e successive
                </button>

                <button
                  onClick={() => setPendingRecurringEdit(null)}
                  className="w-full rounded-2xl bg-zinc-200 text-zinc-700 py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] px-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
              <h3 className="text-lg font-semibold mb-2">
                Elimina spesa ricorrente
              </h3>

              <p className="text-sm text-zinc-600 leading-relaxed mb-5">
                Come vuoi eliminare questa ricorrenza?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => deleteExpense(deleteTarget, 'single')}
                  className="w-full rounded-2xl bg-blue-600 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Solo questa
                </button>

                <button
                  onClick={() => deleteExpense(deleteTarget, 'future')}
                  className="w-full rounded-2xl bg-orange-500 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Solo future
                </button>

                <button
                  onClick={() => deleteExpense(deleteTarget, 'previous')}
                  className="w-full rounded-2xl bg-orange-500 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Solo precedenti
                </button>

                <button
                  onClick={() => deleteExpense(deleteTarget, 'all')}
                  className="w-full rounded-2xl bg-red-600 text-white py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Tutte
                </button>

                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full rounded-2xl bg-zinc-200 text-zinc-700 py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {showIconPicker && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-[80]">
            <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">
                  Seleziona Icona
                </h3>

                <button
                  onClick={() => setShowIconPicker(false)}
                  className="text-sm text-zinc-500"
                >
                  Chiudi
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {availableIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => {
                      setNewExpense((prev) => ({
                        ...prev,
                        icon,
                      }))

                      setShowIconPicker(false)
                    }}
                    className={`aspect-square rounded-2xl border flex items-center justify-center p-3 active:scale-95 transition-transform ${
                      newExpense.icon === icon
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <img
                      src={`/icons/${icon}`}
                      alt={icon}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
            <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold">
                  {editingExpense
                    ? 'Modifica Spesa'
                    : 'Nuova Spesa'}
                </h2>

                <button
                  onClick={() => setShowModal(false)}
                  className="text-zinc-500 text-sm"
                >
                  Chiudi
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 w-full overflow-hidden">
                <input
                  type="text"
                  placeholder="Nome spesa"
                  value={newExpense.title}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="flex-1 min-w-0 rounded-2xl border border-zinc-200 px-4 py-3 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="shrink-0 w-12 h-12 rounded-2xl border border-zinc-200 bg-zinc-100 text-xl active:scale-95 transition-transform overflow-hidden flex items-center justify-center"
                >
                  {newExpense.icon ? (
                    <img
                      src={`/icons/${newExpense.icon}`}
                      alt="Icona"
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    '＋'
                  )}
                </button>
              </div>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Importo"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      amount: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'),
                    }))
                  }
                  className="w-full min-w-0 rounded-2xl border border-zinc-200 px-3 py-3 outline-none appearance-none bg-white text-sm"
                />

                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full min-w-0 rounded-2xl border border-zinc-200 px-2 py-3 outline-none appearance-none bg-white text-sm"
                />

                <select
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none bg-white"
                  value={newExpense.recurrence}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      recurrence: e.target.value,
                    }))
                  }
                >
                  <option>Singola</option>
                  <option>Mensile</option>
                  <option>Annuale</option>
                </select>

                <button
                  onClick={saveExpense}
                  className="w-full bg-black text-white rounded-2xl py-3 font-medium active:scale-[0.98] transition-transform"
                >
                  Salva Spesa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

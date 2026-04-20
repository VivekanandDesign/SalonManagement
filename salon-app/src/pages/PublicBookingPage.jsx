import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Scissors, Calendar, Phone, Loader2, MapPin, Star, AlertCircle, Sparkles } from 'lucide-react';

const API = '/api/public';

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong');
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Booking failed');
  return data;
}

const STEPS = ['Services', 'Date & Time', 'Your Details', 'Confirm'];

export default function PublicBookingPage() {
  const [salon, setSalon] = useState(null);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [openCategories, setOpenCategories] = useState({});

  // Load salon info + services
  useEffect(() => {
    (async () => {
      try {
        const [salonData, serviceData] = await Promise.all([
          apiFetch('/salon'),
          apiFetch('/services'),
        ]);
        setSalon(salonData);
        setCategories(serviceData);
      } catch (err) {
        if (err.message.includes('disabled')) setDisabled(true);
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load time slots when date changes
  useEffect(() => {
    if (!selectedDate || selectedServices.length === 0) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    (async () => {
      try {
        const data = await apiFetch(`/slots?date=${selectedDate}&duration=${totalDuration}`);
        setSlots(data);
      } catch { setSlots([]); }
      finally { setSlotsLoading(false); }
    })();
  }, [selectedDate, selectedServices]);

  const totalDuration = useMemo(() => selectedServices.reduce((s, svc) => s + svc.duration, 0), [selectedServices]);
  const totalPrice = useMemo(() => selectedServices.reduce((s, svc) => s + svc.price, 0), [selectedServices]);

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  // Generate next 14 days
  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        value: d.toISOString().slice(0, 10),
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateLabel: d.getDate(),
        monthLabel: d.toLocaleDateString('en-IN', { month: 'short' }),
        isToday: i === 0,
      });
    }
    return arr;
  }, []);

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return selectedSlot;
    if (step === 2) return name.trim() && phone.replace(/\D/g, '').length === 10;
    return true;
  };

  const handleBook = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await apiPost('/book', {
        name: name.trim(),
        phone: phone.trim(),
        serviceIds: selectedServices.map(s => s.id),
        date: selectedDate,
        startTime: selectedSlot.startTime,
        notes: notes.trim() || undefined,
      });
      setBooked(result.appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        <p className="mt-3 text-sm text-amber-700 font-medium">Loading salon...</p>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-6">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Online Booking Unavailable</h1>
          <p className="text-gray-600 text-sm sm:text-base">Online booking is currently disabled. Please call us to book your appointment.</p>
          {salon?.phone && (
            <a href={`tel:${salon.phone}`} className="mt-6 inline-flex items-center gap-2 text-amber-600 font-semibold text-lg hover:text-amber-700 transition-colors">
              <Phone className="w-5 h-5" /> {salon.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (booked) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-6">We've sent a confirmation to your WhatsApp</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm sm:text-base text-gray-800">{new Date(booked.startTime).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm sm:text-base text-gray-800">{new Date(booked.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="flex items-center gap-3">
              <Scissors className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm sm:text-base text-gray-800">{booked.services?.map(s => s.service?.name).join(', ')}</span>
            </div>
            {booked.stylist?.name && (
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-sm sm:text-base text-gray-800">{booked.stylist.name}</span>
              </div>
            )}
          </div>

          {salon?.address && (
            <div className="flex items-start gap-2 text-gray-500 text-sm mb-4">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{salon.address}</span>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 active:bg-amber-800 transition-colors touch-manipulation"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-white to-amber-50/30">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-amber-100 px-4 py-3 sm:py-4 sticky top-0 z-20">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">O</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate">{salon?.salonName || 'Book Appointment'}</h1>
              {salon?.address && <p className="text-xs text-gray-500 truncate">{salon.address}</p>}
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 sm:h-2 w-full rounded-full transition-all duration-300 ${i <= step ? 'bg-amber-500' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-[10px] sm:text-xs transition-colors ${i <= step ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-28 sm:pb-32">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Step 0: Services */}
        {step === 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Choose Your Services</h2>
            <p className="text-sm text-gray-500 mb-4">Select one or more services</p>

            {categories.map(cat => {
              const isOpen = openCategories[cat.id] ?? false;
              const selectedCount = cat.services.filter(s => selectedServices.some(ss => ss.id === s.id)).length;
              return (
                <div key={cat.id} className="mb-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setOpenCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{cat.name}</h3>
                      {selectedCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">{selectedCount}</span>
                      )}
                      <span className="text-xs text-gray-400 shrink-0">{cat.services.length} services</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2">
                        {cat.services.map(service => {
                          const selected = selectedServices.some(s => s.id === service.id);
                          return (
                            <button
                              key={service.id}
                              onClick={() => toggleService(service)}
                              className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all text-left touch-manipulation ${
                                selected
                                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                                  : 'border-gray-200 bg-white hover:border-amber-300 active:bg-gray-50'
                              }`}
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <span className="font-medium text-gray-900 text-sm sm:text-base">{service.name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                  <Clock className="w-3 h-3 shrink-0" /> {service.duration} min
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm sm:text-base">₹{service.price}</span>
                                {selected && <CheckCircle className="w-5 h-5 text-amber-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Date/Time */}
        {step === 1 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Select Date & Time</h2>
            <p className="text-sm text-gray-500 mb-4">Pick a convenient slot</p>

            {/* Date picker - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {dates.map(d => {
                const selected = selectedDate === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDate(d.value)}
                    className={`flex-shrink-0 w-[4.25rem] sm:w-20 py-3 sm:py-3.5 rounded-xl border text-center transition-all snap-start touch-manipulation ${
                      selected
                        ? 'border-amber-500 bg-amber-600 text-white shadow-md shadow-amber-200'
                        : 'border-gray-200 bg-white hover:border-amber-300 active:bg-amber-50'
                    }`}
                  >
                    <div className={`text-[11px] sm:text-xs font-medium ${selected ? 'text-amber-100' : 'text-gray-500'}`}>{d.dayLabel}</div>
                    <div className={`text-lg sm:text-xl font-bold leading-tight ${selected ? 'text-white' : 'text-gray-900'}`}>{d.dateLabel}</div>
                    <div className={`text-[10px] sm:text-xs ${selected ? 'text-amber-100' : 'text-gray-400'}`}>{d.monthLabel}</div>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map(slot => {
                    const selected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 sm:py-3 rounded-xl border text-sm font-medium transition-all touch-manipulation ${
                          selected
                            ? 'border-amber-500 bg-amber-600 text-white shadow-md shadow-amber-200'
                            : 'border-gray-200 bg-white hover:border-amber-300 active:bg-amber-50 text-gray-700'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No available slots for this date</p>
                  <p className="text-xs text-gray-400 mt-1">Try selecting a different date</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Your Details</h2>
            <p className="text-sm text-gray-500 mb-4">So we can confirm your booking</p>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                  className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number *</label>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all">
                  <span className="px-3 py-3 sm:py-3.5 bg-gray-50 text-gray-500 border-r border-gray-300 text-sm select-none">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    className="flex-1 px-3 py-3 sm:py-3.5 outline-none text-base"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">We'll send booking confirmation via WhatsApp</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Special Requests (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any preferences or notes..."
                  rows={3}
                  className="w-full px-4 py-3 sm:py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none text-base"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Review & Confirm</h2>
            <p className="text-sm text-gray-500 mb-4">Make sure everything looks good</p>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Services */}
              <div className="p-4 sm:p-5 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                  <Scissors className="w-4 h-4" /> Services
                </div>
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between items-center py-1.5">
                    <span className="text-sm sm:text-base text-gray-800">{s.name}</span>
                    <span className="text-sm sm:text-base text-gray-600">₹{s.price}</span>
                  </div>
                ))}
              </div>

              {/* Date / Time */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-500">When:</span>
                <span className="font-medium text-sm sm:text-base text-gray-900">
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {selectedSlot?.time}
                </span>
              </div>

              {/* Customer */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-500">Contact:</span>
                <span className="font-medium text-sm sm:text-base text-gray-900 break-all">{name} ({phone})</span>
              </div>

              {/* Total */}
              <div className="p-4 sm:p-5 bg-amber-50 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-xs text-gray-400 block">{totalDuration} min</span>
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-amber-700">₹{totalPrice}</span>
              </div>
            </div>

            {notes && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 sm:p-4 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Notes: </span>{notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto flex items-center gap-2 sm:gap-3 px-4 py-3 sm:py-4">
          {step > 0 && (
            <button
              onClick={() => { setStep(s => s - 1); setError(''); }}
              className="flex items-center gap-1 px-3 sm:px-4 py-3 text-gray-600 font-medium hover:text-gray-900 active:text-gray-900 transition-colors touch-manipulation"
            >
              <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Summary chip */}
          {selectedServices.length > 0 && step < 3 && (
            <div className="flex-1 text-center text-xs sm:text-sm text-gray-500 truncate">
              {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · ₹{totalPrice} · {totalDuration}min
            </div>
          )}

          {step < 3 ? (
            <button
              onClick={() => { setStep(s => s + 1); setError(''); }}
              disabled={!canNext()}
              className={`ml-auto flex items-center gap-1 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold transition-all touch-manipulation ${
                canNext()
                  ? 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-lg shadow-amber-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={submitting}
              className="ml-auto flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-lg shadow-green-200 transition-all disabled:opacity-50 touch-manipulation"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

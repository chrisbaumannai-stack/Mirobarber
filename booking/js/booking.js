/* ============================================
   MIRO Booking Module – Booking Logic
   Modular, eigenständig, Mock-Daten
   ============================================ */

// ---- Shop Configuration (später pro Shop konfigurierbar) ----
const SHOP_CONFIG = {
  name: 'MIRO Barber Shop',
  phone: '',  // WhatsApp number (deaktiviert im Demo-Modus)
  services: [
    { id: 1, name: 'Haarschnitt',           price: 18, duration: 30, desc: 'Klassisch oder trendig' },
    { id: 2, name: 'Maschinen Haarschnitt', price: 15, duration: 20, desc: 'Schnell, präzise, on point' },
    { id: 3, name: 'Kinder bis 12 Jahre',   price: 15, duration: 20, desc: 'Coole Cuts für die Kleinen' },
    { id: 4, name: 'Rasieren',              price: 10, duration: 20, desc: 'Glatte Rasur mit Präzision' },
    { id: 5, name: 'Musterrasur',           price: 12, duration: 25, desc: 'Individuelle Muster & Designs' },
    { id: 6, name: 'Augenbrauen zupfen',    price: 5,  duration: 10, desc: 'Perfekt geformte Augenbrauen' },
    { id: 7, name: 'Waschen',               price: 5,  duration: 10, desc: 'Gründliche Haarwäsche' },
    { id: 8, name: 'Waschen & Stylen',      price: 8,  duration: 15, desc: 'Waschen, Föhnen und Styling' },
  ],
  // Öffnungszeiten: [start, end] in Stunden (24h), null = geschlossen
  hours: {
    0: null,                    // Sonntag – geschlossen
    1: [9, 19],               // Montag
    2: [9, 19],               // Dienstag
    3: [9, 19],               // Mittwoch
    4: [9, 19],               // Donnerstag
    5: [9, 19],               // Freitag
    6: [9, 17],               // Samstag
  },
  slotInterval: 30,  // Minuten zwischen Slots
};

// ---- Mock: Gebuchte Termine (später aus Supabase) ----
const MOCK_BOOKINGS = [
  // Beispiel: { date: '2026-03-12', time: '10:00' },
];

// ---- State ----
const state = {
  currentStep: 1,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  weekOffset: 0,
};

// ---- DOM References ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  renderServices();
  renderDates();
  updateNavButtons();

  $('#btnNext').addEventListener('click', nextStep);
  $('#btnPrev').addEventListener('click', prevStep);
  $('#btnConfirm').addEventListener('click', confirmBooking);
  $('#prevWeek').addEventListener('click', () => { state.weekOffset--; renderDates(); });
  $('#nextWeek').addEventListener('click', () => { state.weekOffset++; renderDates(); });
});

// ---- Step Navigation ----
function goToStep(step) {
  state.currentStep = step;

  // Show/hide sections
  for (let i = 1; i <= 4; i++) {
    const el = $(`#step-${i}`);
    if (el) el.classList.toggle('hidden', i !== step);
  }
  $('#step-success').classList.add('hidden');

  // Update progress
  $$('.progress-bar .step').forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.toggle('active', sNum === step);
    s.classList.toggle('completed', sNum < step);
  });

  // Render step-specific content
  if (step === 3) renderTimeSlots();
  if (step === 4) renderSummary();

  updateNavButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (state.currentStep === 1 && !state.selectedService) return;
  if (state.currentStep === 2 && !state.selectedDate) return;
  if (state.currentStep === 3 && !state.selectedTime) return;
  if (state.currentStep < 4) goToStep(state.currentStep + 1);
}

function prevStep() {
  if (state.currentStep > 1) goToStep(state.currentStep - 1);
}

function updateNavButtons() {
  const prev = $('#btnPrev');
  const next = $('#btnNext');

  prev.classList.toggle('hidden', state.currentStep <= 1);
  next.classList.toggle('hidden', state.currentStep >= 4);

  // Disable next if nothing selected
  if (state.currentStep === 1) next.disabled = !state.selectedService;
  if (state.currentStep === 2) next.disabled = !state.selectedDate;
  if (state.currentStep === 3) next.disabled = !state.selectedTime;
}

// ---- Step 1: Services ----
function renderServices() {
  const grid = $('#serviceGrid');
  grid.innerHTML = SHOP_CONFIG.services.map(s => `
    <div class="service-card" data-id="${s.id}">
      <div class="service-info">
        <h3>${s.name}</h3>
        <p>${s.desc}</p>
      </div>
      <div class="service-meta">
        <div class="service-price">${s.price}€</div>
        <div class="service-duration">${s.duration} Min.</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      state.selectedService = SHOP_CONFIG.services.find(s => s.id === id);

      grid.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateNavButtons();
    });
  });
}

// ---- Step 2: Dates ----
function renderDates() {
  const grid = $('#dateGrid');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + (state.weekOffset * 7));

  // Don't allow past weeks
  if (startOfWeek < today) startOfWeek.setTime(today.getTime());

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  // Week label
  const endOfRange = new Date(startOfWeek);
  endOfRange.setDate(startOfWeek.getDate() + 6);
  $('#weekLabel').textContent = `${startOfWeek.getDate()}. ${monthNames[startOfWeek.getMonth()]} – ${endOfRange.getDate()}. ${monthNames[endOfRange.getMonth()]}`;

  // Don't go to past
  $('#prevWeek').disabled = state.weekOffset <= 0;
  // Max 4 weeks ahead
  $('#nextWeek').disabled = state.weekOffset >= 3;

  let html = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    const dayOfWeek = date.getDay();
    const isOpen = SHOP_CONFIG.hours[dayOfWeek] !== null;
    const isPast = date < today;
    const disabled = !isOpen || isPast;
    const dateStr = formatDate(date);
    const isSelected = state.selectedDate === dateStr;

    html += `
      <div class="date-card ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
           data-date="${dateStr}" ${disabled ? '' : ''}>
        <div class="day-name">${dayNames[dayOfWeek]}</div>
        <div class="day-number">${date.getDate()}</div>
        <div class="day-month">${monthNames[date.getMonth()]}</div>
      </div>
    `;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.date-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedDate = card.dataset.date;
      state.selectedTime = null; // Reset time on date change

      grid.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateNavButtons();
    });
  });
}

// ---- Step 3: Time Slots ----
function renderTimeSlots() {
  const grid = $('#timeGrid');
  if (!state.selectedDate) return;

  const date = new Date(state.selectedDate + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const hours = SHOP_CONFIG.hours[dayOfWeek];

  if (!hours) {
    grid.innerHTML = '<p style="color: var(--gray-400); text-align: center;">Geschlossen</p>';
    return;
  }

  // Date label
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  $('#selectedDateLabel').textContent = `${dayNames[dayOfWeek]}, ${date.getDate()}. ${monthNames[date.getMonth()]}`;

  const [startHour, endHour] = hours;
  const serviceDuration = state.selectedService ? state.selectedService.duration : 30;
  const interval = SHOP_CONFIG.slotInterval;

  let html = '';
  for (let h = startHour; h < endHour; h += interval / 60) {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    // Check if slot end fits within opening hours
    const slotEnd = h + serviceDuration / 60;
    if (slotEnd > endHour) continue;

    // Check if booked (mock)
    const isBooked = MOCK_BOOKINGS.some(b => b.date === state.selectedDate && b.time === timeStr);

    // Check if time is in the past (for today)
    const now = new Date();
    const slotDate = new Date(state.selectedDate + 'T' + timeStr + ':00');
    const isPast = slotDate <= now;

    const disabled = isBooked || isPast;
    const isSelected = state.selectedTime === timeStr;

    html += `
      <div class="time-slot ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
           data-time="${timeStr}">
        ${timeStr}
      </div>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
    slot.addEventListener('click', () => {
      state.selectedTime = slot.dataset.time;

      grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      updateNavButtons();
    });
  });
}

// ---- Step 4: Summary ----
function renderSummary() {
  if (!state.selectedService || !state.selectedDate || !state.selectedTime) return;

  const date = new Date(state.selectedDate + 'T00:00:00');
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  $('#summaryService').textContent = state.selectedService.name;
  $('#summaryDate').textContent = `${dayNames[date.getDay()]}, ${date.getDate()}. ${monthNames[date.getMonth()]}`;
  $('#summaryTime').textContent = `${state.selectedTime} Uhr`;
  $('#summaryDuration').textContent = `${state.selectedService.duration} Min.`;
  $('#summaryPrice').textContent = `${state.selectedService.price}€`;
}

// ---- Confirm Booking ----
function confirmBooking() {
  const name = $('#customerName').value.trim();
  const phone = $('#customerPhone').value.trim();
  const note = $('#customerNote').value.trim();

  if (!name) { $('#customerName').focus(); return; }
  if (!phone) { $('#customerPhone').focus(); return; }

  const date = new Date(state.selectedDate + 'T00:00:00');
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  // DEMO MODE – no WhatsApp message sent
  alert('DEMO-MODUS: Terminanfrage wurde NICHT gesendet.\n\nKeine Nachricht wurde verschickt.\nDiese Funktion wird aktiviert, sobald der Shop live geht.');

  // Show success
  showSuccess(name, date, dayNames);
}

function showSuccess(name, date, dayNames) {
  // Hide all steps
  for (let i = 1; i <= 4; i++) {
    const el = $(`#step-${i}`);
    if (el) el.classList.add('hidden');
  }
  $('#bookingNav').classList.add('hidden');

  $('#successDetails').innerHTML = `
    <strong>${state.selectedService.name}</strong><br>
    ${dayNames[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}. um ${state.selectedTime} Uhr<br>
    Dauer: ${state.selectedService.duration} Min. · ${state.selectedService.price}€<br><br>
    Gebucht von: ${name}
  `;

  $('#step-success').classList.remove('hidden');

  // Update progress
  $$('.progress-bar .step').forEach(s => s.classList.add('completed'));

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Helpers ----
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

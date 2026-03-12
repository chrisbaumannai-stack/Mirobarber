/* ============================================
   MIRO Booking Module – Booking Logic
   Nutzt das MiroBooking SDK für Daten
   ============================================ */

// ---- State ----
const state = {
  currentStep: 1,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  weekOffset: 0,
};

let engine = null;
let services = [];
let shopHours = {};

// ---- DOM References ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  // Init SDK (local mode – no Supabase config needed)
  engine = await MiroBooking.init({
    storagePrefix: 'miro_',
    shopId: 'miro-koblenz'
  });

  // Load data from SDK
  services = await engine.getServices();
  shopHours = await engine.getHours();

  renderServices();
  renderDates();
  updateNavButtons();

  $('#btnNext').addEventListener('click', nextStep);
  $('#btnPrev').addEventListener('click', prevStep);
  $('#btnConfirm').addEventListener('click', confirmBooking);
  $('#prevWeek').addEventListener('click', () => { state.weekOffset--; renderDates(); });
  $('#nextWeek').addEventListener('click', () => { state.weekOffset++; renderDates(); });

  // Show mode indicator
  const badge = document.createElement('div');
  badge.className = 'mode-badge';
  badge.textContent = engine.getMode() === 'supabase' ? 'LIVE' : 'DEMO';
  badge.style.cssText = 'position:fixed;bottom:1rem;right:1rem;background:' +
    (engine.getMode() === 'supabase' ? '#2ecc71' : '#c9a96e') +
    ';color:#000;padding:0.25rem 0.75rem;border-radius:2rem;font-size:0.7rem;font-weight:700;z-index:999;letter-spacing:0.05em;';
  document.body.appendChild(badge);
});

// ---- Step Navigation ----
function goToStep(step) {
  state.currentStep = step;

  for (let i = 1; i <= 4; i++) {
    const el = $(`#step-${i}`);
    if (el) el.classList.toggle('hidden', i !== step);
  }
  $('#step-success').classList.add('hidden');

  $$('.progress-bar .step').forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.toggle('active', sNum === step);
    s.classList.toggle('completed', sNum < step);
  });

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

  if (state.currentStep === 1) next.disabled = !state.selectedService;
  if (state.currentStep === 2) next.disabled = !state.selectedDate;
  if (state.currentStep === 3) next.disabled = !state.selectedTime;
}

// ---- Step 1: Services ----
function renderServices() {
  const grid = $('#serviceGrid');
  grid.innerHTML = services.map(s => `
    <div class="service-card" data-id="${s.id}">
      <div class="service-info">
        <h3>${s.name}</h3>
        <p>${s.description || ''}</p>
      </div>
      <div class="service-meta">
        <div class="service-price">${s.price}€</div>
        <div class="service-duration">${s.duration} Min.</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      state.selectedService = services.find(s => s.id === id || s.id === parseInt(id));

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
  if (startOfWeek < today) startOfWeek.setTime(today.getTime());

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const endOfRange = new Date(startOfWeek);
  endOfRange.setDate(startOfWeek.getDate() + 6);
  $('#weekLabel').textContent = `${startOfWeek.getDate()}. ${monthNames[startOfWeek.getMonth()]} – ${endOfRange.getDate()}. ${monthNames[endOfRange.getMonth()]}`;

  $('#prevWeek').disabled = state.weekOffset <= 0;
  $('#nextWeek').disabled = state.weekOffset >= 3;

  let html = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    const dayOfWeek = date.getDay();
    const dayHours = shopHours[dayOfWeek];
    const isOpen = dayHours && dayHours.open !== false;
    const isPast = date < today;
    const disabled = !isOpen || isPast;
    const dateStr = formatDateISO(date);
    const isSelected = state.selectedDate === dateStr;

    html += `
      <div class="date-card ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
           data-date="${dateStr}">
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
      state.selectedTime = null;

      grid.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateNavButtons();
    });
  });
}

// ---- Step 3: Time Slots ----
async function renderTimeSlots() {
  const grid = $('#timeGrid');
  if (!state.selectedDate || !state.selectedService) return;

  // Show loading
  grid.innerHTML = '<p style="color: var(--gray-400); text-align: center;">Verfügbare Zeiten laden...</p>';

  // Date label
  const date = new Date(state.selectedDate + 'T00:00:00');
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  $('#selectedDateLabel').textContent = `${dayNames[date.getDay()]}, ${date.getDate()}. ${monthNames[date.getMonth()]}`;

  // Get available slots from SDK (checks existing bookings!)
  const slots = await engine.getAvailableSlots(state.selectedDate, state.selectedService.id);

  if (slots.length === 0) {
    grid.innerHTML = '<p style="color: var(--gray-400); text-align: center;">Keine verfügbaren Zeiten an diesem Tag</p>';
    return;
  }

  grid.innerHTML = slots.map(slot => {
    const isSelected = state.selectedTime === slot.time;
    return `
      <div class="time-slot ${isSelected ? 'selected' : ''}" data-time="${slot.time}">
        ${slot.time}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.time-slot').forEach(slotEl => {
    slotEl.addEventListener('click', () => {
      state.selectedTime = slotEl.dataset.time;

      grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      slotEl.classList.add('selected');
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
async function confirmBooking() {
  const name = $('#customerName').value.trim();
  const phone = $('#customerPhone').value.trim();
  const note = $('#customerNote').value.trim();

  if (!name) { $('#customerName').focus(); return; }
  if (!phone) { $('#customerPhone').focus(); return; }

  // Disable button while saving
  const btn = $('#btnConfirm');
  btn.disabled = true;
  btn.textContent = 'Wird gespeichert...';

  try {
    // Save appointment via SDK (goes to localStorage OR Supabase)
    await engine.createAppointment({
      serviceId: state.selectedService.id,
      serviceName: state.selectedService.name,
      date: state.selectedDate,
      time: state.selectedTime,
      customerName: name,
      customerPhone: phone,
      note: note,
      status: 'pending'
    });

    // Show success
    const date = new Date(state.selectedDate + 'T00:00:00');
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    showSuccess(name, date, dayNames);

  } catch (err) {
    console.error('Booking error:', err);
    btn.disabled = false;
    btn.textContent = 'Termin bestätigen';
    alert('Fehler beim Speichern. Bitte versuche es erneut.');
  }
}

function showSuccess(name, date, dayNames) {
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
  $$('.progress-bar .step').forEach(s => s.classList.add('completed'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Helpers ----
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

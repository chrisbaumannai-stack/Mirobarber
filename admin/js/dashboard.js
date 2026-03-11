/* ============================================
   MIRO Dashboard – JavaScript
   Alle Daten in localStorage (Demo-Modus)
   ============================================ */

// ---- Default Data ----
const DEFAULT_SERVICES = [
  { id: 1, name: 'Haarschnitt',        price: 25, duration: 30, desc: 'Waschen, Schneiden, Styling' },
  { id: 2, name: 'Bart trimmen',       price: 15, duration: 20, desc: 'Barttrimmen & Konturen' },
  { id: 3, name: 'Haarschnitt + Bart', price: 35, duration: 45, desc: 'Komplett-Paket' },
  { id: 4, name: 'Rasur',              price: 20, duration: 25, desc: 'Klassische Nassrasur mit Rasiermesser' },
  { id: 5, name: 'Haare + Bart + Rasur', price: 45, duration: 60, desc: 'Das volle Premium-Programm' },
  { id: 6, name: 'Kinder (bis 12)',    price: 15, duration: 20, desc: 'Kinderhaarschnitt' },
];

const DEFAULT_HOURS = {
  0: null,
  1: ['09:00', '18:30'],
  2: ['09:00', '18:30'],
  3: ['09:00', '18:30'],
  4: ['09:00', '18:30'],
  5: ['09:00', '18:30'],
  6: ['09:00', '16:00'],
};

const DEFAULT_SETTINGS = {
  name: 'MIRO Barber Shop',
  phone: '',
  address: 'Moselweißer Str. 29, 56073 Koblenz',
  slotInterval: 30,
};

// ---- Data Store (localStorage) ----
function getData(key, fallback) {
  const raw = localStorage.getItem('miro_' + key);
  return raw ? JSON.parse(raw) : fallback;
}

function setData(key, value) {
  localStorage.setItem('miro_' + key, JSON.stringify(value));
}

// ---- Init ----
let services = getData('services', DEFAULT_SERVICES);
let appointments = getData('appointments', []);
let hours = getData('hours', DEFAULT_HOURS);
let settings = getData('settings', DEFAULT_SETTINGS);
let currentFilter = 'upcoming';
let editingServiceId = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAppointments();
  initServices();
  initHours();
  initSettings();
  updateStats();
  renderTodayOverview();
});

// ---- Navigation ----
function initNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar on tab click (mobile)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
}

function switchTab(tabName) {
  // Update nav
  document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (navItem) navItem.classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabName);
  if (tab) tab.classList.add('active');

  // Update title
  const titles = { overview: 'Übersicht', appointments: 'Termine', services: 'Services', hours: 'Öffnungszeiten', settings: 'Einstellungen' };
  document.getElementById('pageTitle').textContent = titles[tabName] || tabName;
}

// Make switchTab globally available for onclick handlers
window.switchTab = switchTab;

// ---- Stats ----
function updateStats() {
  const today = formatDate(new Date());
  const todayAppts = appointments.filter(a => a.date === today && a.status !== 'cancelled');
  document.getElementById('statToday').textContent = todayAppts.length;

  // This week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekAppts = appointments.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d >= startOfWeek && d <= endOfWeek && a.status !== 'cancelled';
  });
  document.getElementById('statWeek').textContent = weekAppts.length;

  // Revenue
  const revenue = weekAppts.reduce((sum, a) => {
    const svc = services.find(s => s.id === a.serviceId);
    return sum + (svc ? svc.price : 0);
  }, 0);
  document.getElementById('statRevenue').innerHTML = revenue + ' &euro;';

  document.getElementById('statServices').textContent = services.length;
}

function renderTodayOverview() {
  const today = formatDate(new Date());
  const todayAppts = appointments
    .filter(a => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));

  const container = document.getElementById('todayAppointments');

  if (todayAppts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Keine Termine für heute</p>
        <span class="empty-hint">Termine erscheinen hier, sobald Kunden buchen</span>
      </div>`;
    return;
  }

  container.innerHTML = todayAppts.map(a => {
    const svc = services.find(s => s.id === a.serviceId);
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--dark-4);">
        <div>
          <strong>${a.time}</strong> – ${a.customerName}
          <div style="font-size: 0.8rem; color: var(--gray-400);">${svc ? svc.name : 'Unbekannt'}</div>
        </div>
        <span class="status-badge status-${a.status}">${statusLabel(a.status)}</span>
      </div>`;
  }).join('');
}

// ---- Appointments ----
function initAppointments() {
  document.getElementById('btnNewAppointment').addEventListener('click', () => {
    document.getElementById('newAppointmentForm').classList.remove('hidden');
    populateServiceDropdown('apptService');
    const dateInput = document.getElementById('apptDate');
    dateInput.min = formatDate(new Date());
    dateInput.value = formatDate(new Date());
  });

  document.getElementById('btnCancelAppointment').addEventListener('click', () => {
    document.getElementById('newAppointmentForm').classList.add('hidden');
  });

  document.getElementById('btnSaveAppointment').addEventListener('click', saveAppointment);

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAppointments();
    });
  });

  renderAppointments();
}

function saveAppointment() {
  const name = document.getElementById('apptName').value.trim();
  const phone = document.getElementById('apptPhone').value.trim();
  const serviceId = parseInt(document.getElementById('apptService').value);
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  const note = document.getElementById('apptNote').value.trim();

  if (!name || !serviceId || !date || !time) {
    showToast('Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  const appointment = {
    id: Date.now(),
    customerName: name,
    phone: phone,
    serviceId: serviceId,
    date: date,
    time: time,
    note: note,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  appointments.push(appointment);
  setData('appointments', appointments);

  // Reset form
  document.getElementById('newAppointmentForm').classList.add('hidden');
  document.getElementById('apptName').value = '';
  document.getElementById('apptPhone').value = '';
  document.getElementById('apptNote').value = '';

  renderAppointments();
  updateStats();
  renderTodayOverview();
  showToast('Termin gespeichert');
}

function renderAppointments() {
  const today = formatDate(new Date());
  let filtered = [...appointments];

  switch (currentFilter) {
    case 'today':
      filtered = filtered.filter(a => a.date === today);
      break;
    case 'upcoming':
      filtered = filtered.filter(a => a.date >= today && a.status !== 'cancelled');
      break;
    case 'past':
      filtered = filtered.filter(a => a.date < today);
      break;
  }

  filtered.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
  });

  const tbody = document.getElementById('appointmentsBody');
  const empty = document.getElementById('appointmentsEmpty');
  const table = document.getElementById('appointmentsTable');

  if (filtered.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  tbody.innerHTML = filtered.map(a => {
    const svc = services.find(s => s.id === a.serviceId);
    const d = new Date(a.date + 'T00:00:00');
    const dateStr = `${dayNames[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;

    return `
      <tr>
        <td>${dateStr}</td>
        <td>${a.time}</td>
        <td>${a.customerName}</td>
        <td>${svc ? svc.name : '–'}</td>
        <td>${svc ? svc.price + '€' : '–'}</td>
        <td><span class="status-badge status-${a.status}">${statusLabel(a.status)}</span></td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            ${a.status === 'pending' ? `<button class="btn-primary btn-sm" onclick="updateStatus(${a.id}, 'confirmed')">Bestätigen</button>` : ''}
            ${a.status !== 'cancelled' && a.status !== 'completed' ? `<button class="btn-secondary btn-sm" onclick="updateStatus(${a.id}, 'completed')">Erledigt</button>` : ''}
            ${a.status !== 'cancelled' ? `<button class="btn-danger btn-sm" onclick="updateStatus(${a.id}, 'cancelled')">Storno</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function updateStatus(id, status) {
  const appt = appointments.find(a => a.id === id);
  if (appt) {
    appt.status = status;
    setData('appointments', appointments);
    renderAppointments();
    updateStats();
    renderTodayOverview();
    showToast('Status aktualisiert');
  }
}
window.updateStatus = updateStatus;

function populateServiceDropdown(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Service wählen...</option>' +
    services.map(s => `<option value="${s.id}">${s.name} (${s.price}€, ${s.duration} Min.)</option>`).join('');
}

// ---- Services ----
function initServices() {
  document.getElementById('btnNewService').addEventListener('click', () => {
    editingServiceId = null;
    document.getElementById('serviceFormTitle').textContent = 'Neuen Service anlegen';
    document.getElementById('svcName').value = '';
    document.getElementById('svcPrice').value = '';
    document.getElementById('svcDuration').value = '';
    document.getElementById('svcDesc').value = '';
    document.getElementById('newServiceForm').classList.remove('hidden');
  });

  document.getElementById('btnCancelService').addEventListener('click', () => {
    document.getElementById('newServiceForm').classList.add('hidden');
    editingServiceId = null;
  });

  document.getElementById('btnSaveService').addEventListener('click', saveService);

  renderServices();
}

function saveService() {
  const name = document.getElementById('svcName').value.trim();
  const price = parseInt(document.getElementById('svcPrice').value);
  const duration = parseInt(document.getElementById('svcDuration').value);
  const desc = document.getElementById('svcDesc').value.trim();

  if (!name || isNaN(price) || isNaN(duration)) {
    showToast('Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  if (editingServiceId) {
    const svc = services.find(s => s.id === editingServiceId);
    if (svc) {
      svc.name = name;
      svc.price = price;
      svc.duration = duration;
      svc.desc = desc;
    }
  } else {
    const maxId = services.reduce((max, s) => Math.max(max, s.id), 0);
    services.push({ id: maxId + 1, name, price, duration, desc });
  }

  setData('services', services);
  document.getElementById('newServiceForm').classList.add('hidden');
  editingServiceId = null;
  renderServices();
  updateStats();
  showToast('Service gespeichert');
}

function editService(id) {
  const svc = services.find(s => s.id === id);
  if (!svc) return;

  editingServiceId = id;
  document.getElementById('serviceFormTitle').textContent = 'Service bearbeiten';
  document.getElementById('svcName').value = svc.name;
  document.getElementById('svcPrice').value = svc.price;
  document.getElementById('svcDuration').value = svc.duration;
  document.getElementById('svcDesc').value = svc.desc || '';
  document.getElementById('newServiceForm').classList.remove('hidden');
}
window.editService = editService;

function deleteService(id) {
  if (!confirm('Service wirklich löschen?')) return;
  services = services.filter(s => s.id !== id);
  setData('services', services);
  renderServices();
  updateStats();
  showToast('Service gelöscht');
}
window.deleteService = deleteService;

function renderServices() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = services.map(s => `
    <div class="service-card-admin">
      <h3>${s.name}</h3>
      <p class="service-desc">${s.desc || '–'}</p>
      <div class="service-meta-admin">
        <span>${s.price}€</span>
        <span>${s.duration} Min.</span>
      </div>
      <div class="service-actions">
        <button class="btn-secondary btn-sm" onclick="editService(${s.id})">Bearbeiten</button>
        <button class="btn-danger btn-sm" onclick="deleteService(${s.id})">Löschen</button>
      </div>
    </div>
  `).join('');
}

// ---- Hours ----
function initHours() {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const container = document.getElementById('hoursForm');

  container.innerHTML = dayNames.map((name, i) => {
    const isOpen = hours[i] !== null;
    const openTime = isOpen ? hours[i][0] : '09:00';
    const closeTime = isOpen ? hours[i][1] : '18:00';

    return `
      <div class="hours-row">
        <span class="day-name">${name}</span>
        <div class="hours-inputs">
          <input type="checkbox" class="hours-toggle" data-day="${i}" ${isOpen ? 'checked' : ''} onchange="toggleDay(${i}, this.checked)">
          <div id="hours-times-${i}" ${!isOpen ? 'style="opacity: 0.3; pointer-events: none;"' : ''}>
            <input type="time" id="hours-open-${i}" value="${openTime}" step="1800">
            <span class="hours-sep">bis</span>
            <input type="time" id="hours-close-${i}" value="${closeTime}" step="1800">
          </div>
          ${!isOpen ? '<span class="closed-label">Geschlossen</span>' : ''}
        </div>
      </div>`;
  }).join('');

  document.getElementById('btnSaveHours').addEventListener('click', saveHours);
}

function toggleDay(day, isOpen) {
  const timesEl = document.getElementById('hours-times-' + day);
  const row = timesEl.closest('.hours-inputs');

  if (isOpen) {
    timesEl.style.opacity = '1';
    timesEl.style.pointerEvents = 'auto';
    const closedLabel = row.querySelector('.closed-label');
    if (closedLabel) closedLabel.remove();
  } else {
    timesEl.style.opacity = '0.3';
    timesEl.style.pointerEvents = 'none';
    if (!row.querySelector('.closed-label')) {
      const span = document.createElement('span');
      span.className = 'closed-label';
      span.textContent = 'Geschlossen';
      row.appendChild(span);
    }
  }
}
window.toggleDay = toggleDay;

function saveHours() {
  for (let i = 0; i < 7; i++) {
    const toggle = document.querySelector(`.hours-toggle[data-day="${i}"]`);
    if (toggle.checked) {
      const open = document.getElementById('hours-open-' + i).value;
      const close = document.getElementById('hours-close-' + i).value;
      hours[i] = [open, close];
    } else {
      hours[i] = null;
    }
  }
  setData('hours', hours);
  showToast('Öffnungszeiten gespeichert');
}

// ---- Settings ----
function initSettings() {
  document.getElementById('settingName').value = settings.name;
  document.getElementById('settingPhone').value = settings.phone;
  document.getElementById('settingAddress').value = settings.address;
  document.getElementById('settingSlotInterval').value = settings.slotInterval;

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    settings.name = document.getElementById('settingName').value.trim();
    settings.phone = document.getElementById('settingPhone').value.trim();
    settings.address = document.getElementById('settingAddress').value.trim();
    settings.slotInterval = parseInt(document.getElementById('settingSlotInterval').value);
    setData('settings', settings);
    showToast('Einstellungen gespeichert');
  });
}

// ---- Helpers ----
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function statusLabel(status) {
  const labels = {
    pending: 'Offen',
    confirmed: 'Bestätigt',
    completed: 'Erledigt',
    cancelled: 'Storniert',
  };
  return labels[status] || status;
}

// ---- Toast ----
let toastEl = null;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

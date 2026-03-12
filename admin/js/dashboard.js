/* ============================================
   MIRO Dashboard – JavaScript
   Nutzt das MiroBooking SDK für Datenverwaltung
   ============================================ */

let engine = null;
let services = [];
let appointments = [];
let hours = {};
let settings = {};
let currentFilter = 'upcoming';
let editingServiceId = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  // Init SDK
  engine = await MiroBooking.init({
    storagePrefix: 'miro_',
    shopId: 'miro-koblenz'
  });

  // Load all data
  await refreshData();

  initNavigation();
  initAppointments();
  initServices();
  initHours();
  initSettings();
  updateStats();
  renderTodayOverview();

  // Update mode badge
  const badge = document.querySelector('.demo-badge');
  if (badge) {
    badge.textContent = engine.getMode() === 'supabase' ? 'LIVE' : 'DEMO';
    badge.style.background = engine.getMode() === 'supabase' ? '#2ecc71' : '';
  }

  // Listen for real-time updates
  engine.events.on('appointment:created', () => refreshAndRender());
  engine.events.on('appointment:updated', () => refreshAndRender());
  engine.events.on('service:created', () => refreshAndRender());
  engine.events.on('service:updated', () => refreshAndRender());
  engine.events.on('service:deleted', () => refreshAndRender());
});

async function refreshData() {
  services = await engine.getServices(false);
  appointments = await engine.getAppointments();
  hours = await engine.getHours();
  settings = await engine.getSettings();
}

async function refreshAndRender() {
  await refreshData();
  renderAppointments();
  renderServices();
  updateStats();
  renderTodayOverview();
}

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

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (navItem) navItem.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabName);
  if (tab) tab.classList.add('active');

  const titles = { overview: 'Übersicht', appointments: 'Termine', services: 'Services', hours: 'Öffnungszeiten', settings: 'Einstellungen' };
  document.getElementById('pageTitle').textContent = titles[tabName] || tabName;

  // Refresh data when switching tabs
  if (tabName === 'appointments') refreshData().then(() => renderAppointments());
  if (tabName === 'overview') refreshData().then(() => { updateStats(); renderTodayOverview(); });
}

window.switchTab = switchTab;

// ---- Stats ----
async function updateStats() {
  const stats = await engine.getStats();
  document.getElementById('statToday').textContent = stats.today;
  document.getElementById('statWeek').textContent = stats.week;
  document.getElementById('statRevenue').innerHTML = stats.revenue + ' &euro;';
  document.getElementById('statServices').textContent = stats.serviceCount;
}

async function renderTodayOverview() {
  const stats = await engine.getStats();
  const todayAppts = stats.todayAppointments;
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
          <div style="font-size: 0.8rem; color: var(--gray-400);">${a.serviceName || (svc ? svc.name : 'Unbekannt')}</div>
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

async function saveAppointment() {
  const name = document.getElementById('apptName').value.trim();
  const phone = document.getElementById('apptPhone').value.trim();
  const serviceId = document.getElementById('apptService').value;
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  const note = document.getElementById('apptNote').value.trim();

  if (!name || !serviceId || !date || !time) {
    showToast('Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  const svc = services.find(s => String(s.id) === String(serviceId));

  await engine.createAppointment({
    customerName: name,
    customerPhone: phone,
    serviceId: serviceId,
    serviceName: svc ? svc.name : '',
    date: date,
    time: time,
    note: note,
    status: 'confirmed'
  });

  // Reset form
  document.getElementById('newAppointmentForm').classList.add('hidden');
  document.getElementById('apptName').value = '';
  document.getElementById('apptPhone').value = '';
  document.getElementById('apptNote').value = '';

  await refreshData();
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
    const svc = services.find(s => String(s.id) === String(a.serviceId));
    const d = new Date(a.date + 'T00:00:00');
    const dateStr = `${dayNames[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;

    return `
      <tr>
        <td>${dateStr}</td>
        <td>${a.time}</td>
        <td>${a.customerName}</td>
        <td>${a.serviceName || (svc ? svc.name : '–')}</td>
        <td>${svc ? svc.price + '€' : '–'}</td>
        <td><span class="status-badge status-${a.status}">${statusLabel(a.status)}</span></td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            ${a.status === 'pending' ? `<button class="btn-primary btn-sm" onclick="updateStatus('${a.id}', 'confirmed')">Bestätigen</button>` : ''}
            ${a.status !== 'cancelled' && a.status !== 'completed' ? `<button class="btn-secondary btn-sm" onclick="updateStatus('${a.id}', 'completed')">Erledigt</button>` : ''}
            ${a.status !== 'cancelled' ? `<button class="btn-danger btn-sm" onclick="updateStatus('${a.id}', 'cancelled')">Storno</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function updateStatus(id, status) {
  await engine.updateAppointment(id, { status });
  await refreshData();
  renderAppointments();
  updateStats();
  renderTodayOverview();
  showToast('Status aktualisiert');
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

async function saveService() {
  const name = document.getElementById('svcName').value.trim();
  const price = parseInt(document.getElementById('svcPrice').value);
  const duration = parseInt(document.getElementById('svcDuration').value);
  const description = document.getElementById('svcDesc').value.trim();

  if (!name || isNaN(price) || isNaN(duration)) {
    showToast('Bitte alle Pflichtfelder ausfüllen');
    return;
  }

  if (editingServiceId) {
    await engine.saveService({ id: editingServiceId, name, price, duration, description });
  } else {
    await engine.saveService({ name, price, duration, description, active: true });
  }

  document.getElementById('newServiceForm').classList.add('hidden');
  editingServiceId = null;
  await refreshData();
  renderServices();
  updateStats();
  showToast('Service gespeichert');
}

function editService(id) {
  const svc = services.find(s => String(s.id) === String(id));
  if (!svc) return;

  editingServiceId = id;
  document.getElementById('serviceFormTitle').textContent = 'Service bearbeiten';
  document.getElementById('svcName').value = svc.name;
  document.getElementById('svcPrice').value = svc.price;
  document.getElementById('svcDuration').value = svc.duration;
  document.getElementById('svcDesc').value = svc.description || svc.desc || '';
  document.getElementById('newServiceForm').classList.remove('hidden');
}
window.editService = editService;

async function deleteService(id) {
  if (!confirm('Service wirklich löschen?')) return;
  await engine.deleteService(id);
  await refreshData();
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
      <p class="service-desc">${s.description || s.desc || '–'}</p>
      <div class="service-meta-admin">
        <span>${s.price}€</span>
        <span>${s.duration} Min.</span>
      </div>
      <div class="service-actions">
        <button class="btn-secondary btn-sm" onclick="editService('${s.id}')">Bearbeiten</button>
        <button class="btn-danger btn-sm" onclick="deleteService('${s.id}')">Löschen</button>
      </div>
    </div>
  `).join('');
}

// ---- Hours ----
function initHours() {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const container = document.getElementById('hoursForm');

  container.innerHTML = dayNames.map((name, i) => {
    const dayData = hours[i];
    const isOpen = dayData && dayData.open !== false;
    const openTime = isOpen ? (dayData.from || '09:00') : '09:00';
    const closeTime = isOpen ? (dayData.to || '18:00') : '18:00';

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

  document.getElementById('btnSaveHours').addEventListener('click', saveHoursHandler);
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

async function saveHoursHandler() {
  const newHours = {};
  for (let i = 0; i < 7; i++) {
    const toggle = document.querySelector(`.hours-toggle[data-day="${i}"]`);
    if (toggle.checked) {
      const from = document.getElementById('hours-open-' + i).value;
      const to = document.getElementById('hours-close-' + i).value;
      newHours[i] = { open: true, from, to };
    } else {
      newHours[i] = { open: false, from: '09:00', to: '18:00' };
    }
  }
  await engine.saveHours(newHours);
  hours = newHours;
  showToast('Öffnungszeiten gespeichert');
}

// ---- Settings ----
function initSettings() {
  document.getElementById('settingName').value = settings.shopName || settings.name || '';
  document.getElementById('settingPhone').value = settings.phone || '';
  document.getElementById('settingAddress').value = settings.address || '';
  document.getElementById('settingSlotInterval').value = settings.slotInterval || 30;

  document.getElementById('btnSaveSettings').addEventListener('click', async () => {
    const newSettings = {
      shopName: document.getElementById('settingName').value.trim(),
      phone: document.getElementById('settingPhone').value.trim(),
      address: document.getElementById('settingAddress').value.trim(),
      slotInterval: parseInt(document.getElementById('settingSlotInterval').value)
    };
    await engine.saveSettings(newSettings);
    settings = newSettings;
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

/**
 * MIRO Booking SDK v1.0
 * Standalone, modulares Buchungssystem
 * Kann in jede Website eingebunden werden
 *
 * Usage:
 *   <script src="sdk/miro-booking.js"></script>
 *   <script>
 *     const booking = MiroBooking.init({
 *       supabaseUrl: 'https://xxx.supabase.co',
 *       supabaseKey: 'public-anon-key',
 *       shopId: 'miro-koblenz'
 *     });
 *   </script>
 */
;(function (root) {
  'use strict';

  /* ───────────────────────────────────────────
     DEFAULT CONFIGURATION
  ─────────────────────────────────────────── */
  const DEFAULTS = {
    shopId: 'miro-default',
    storagePrefix: 'miro_',
    slotInterval: 30,
    currency: '€',
    locale: 'de-DE',
    services: [
      { id: 's1', name: 'Haarschnitt', price: 18, duration: 30, description: 'Klassischer Haarschnitt mit Styling', active: true },
      { id: 's2', name: 'Maschinen Haarschnitt', price: 15, duration: 20, description: 'Maschinenschnitt auf gewünschte Länge', active: true },
      { id: 's3', name: 'Kinder bis 12 Jahre', price: 15, duration: 20, description: 'Haarschnitt für Kids', active: true },
      { id: 's4', name: 'Rasieren', price: 10, duration: 20, description: 'Traditionelle Nassrasur', active: true },
      { id: 's5', name: 'Musterrasur', price: 12, duration: 25, description: 'Rasur mit Muster nach Wunsch', active: true },
      { id: 's6', name: 'Augenbrauen zupfen', price: 5, duration: 10, description: 'Augenbrauen in Form bringen', active: true },
      { id: 's7', name: 'Waschen', price: 5, duration: 10, description: 'Haarwäsche', active: true },
      { id: 's8', name: 'Waschen & Stylen', price: 8, duration: 15, description: 'Waschen und Styling', active: true }
    ],
    hours: {
      0: { open: false, from: '09:00', to: '19:00' },
      1: { open: true,  from: '09:00', to: '19:00' },
      2: { open: true,  from: '09:00', to: '19:00' },
      3: { open: true,  from: '09:00', to: '19:00' },
      4: { open: true,  from: '09:00', to: '19:00' },
      5: { open: true,  from: '09:00', to: '19:00' },
      6: { open: true,  from: '09:00', to: '17:00' }
    },
    settings: {
      shopName: 'MIRO Barber Shop',
      phone: '',
      address: 'Moselweißer Str. 29, 56073 Koblenz',
      slotInterval: 30
    }
  };

  /* ───────────────────────────────────────────
     STORAGE ADAPTER (localStorage fallback)
  ─────────────────────────────────────────── */
  class LocalAdapter {
    constructor(prefix) {
      this.prefix = prefix;
    }

    _key(name) { return this.prefix + name; }

    async getAll(table) {
      const raw = localStorage.getItem(this._key(table));
      return raw ? JSON.parse(raw) : null;
    }

    async setAll(table, data) {
      localStorage.setItem(this._key(table), JSON.stringify(data));
    }

    async insert(table, record) {
      const all = await this.getAll(table) || [];
      record.id = record.id || crypto.randomUUID();
      record.created_at = record.created_at || new Date().toISOString();
      all.push(record);
      await this.setAll(table, all);
      return record;
    }

    async update(table, id, changes) {
      const all = await this.getAll(table) || [];
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return null;
      Object.assign(all[idx], changes, { updated_at: new Date().toISOString() });
      await this.setAll(table, all);
      return all[idx];
    }

    async remove(table, id) {
      let all = await this.getAll(table) || [];
      all = all.filter(r => r.id !== id);
      await this.setAll(table, all);
    }

    async query(table, filters) {
      let all = await this.getAll(table) || [];
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          all = all.filter(r => r[key] === val);
        });
      }
      return all;
    }
  }

  /* ───────────────────────────────────────────
     SUPABASE ADAPTER
  ─────────────────────────────────────────── */
  class SupabaseAdapter {
    constructor(url, key, shopId) {
      this.url = url.replace(/\/$/, '');
      this.key = key;
      this.shopId = shopId;
      this.headers = {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
    }

    async _fetch(endpoint, options = {}) {
      const res = await fetch(this.url + '/rest/v1/' + endpoint, {
        ...options,
        headers: { ...this.headers, ...(options.headers || {}) }
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error('Supabase error: ' + err);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    async getAll(table) {
      return this._fetch(table + '?shop_id=eq.' + this.shopId + '&order=created_at.asc');
    }

    async insert(table, record) {
      record.shop_id = this.shopId;
      record.created_at = record.created_at || new Date().toISOString();
      const result = await this._fetch(table, {
        method: 'POST',
        body: JSON.stringify(record)
      });
      return Array.isArray(result) ? result[0] : result;
    }

    async update(table, id, changes) {
      changes.updated_at = new Date().toISOString();
      const result = await this._fetch(table + '?id=eq.' + id + '&shop_id=eq.' + this.shopId, {
        method: 'PATCH',
        body: JSON.stringify(changes)
      });
      return Array.isArray(result) ? result[0] : result;
    }

    async remove(table, id) {
      await this._fetch(table + '?id=eq.' + id + '&shop_id=eq.' + this.shopId, {
        method: 'DELETE'
      });
    }

    async query(table, filters) {
      let qs = '?shop_id=eq.' + this.shopId;
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          qs += '&' + key + '=eq.' + val;
        });
      }
      qs += '&order=created_at.asc';
      return this._fetch(table + qs);
    }
  }

  /* ───────────────────────────────────────────
     EVENT EMITTER
  ─────────────────────────────────────────── */
  class EventBus {
    constructor() { this._handlers = {}; }

    on(event, fn) {
      (this._handlers[event] = this._handlers[event] || []).push(fn);
      return () => this.off(event, fn);
    }

    off(event, fn) {
      if (!this._handlers[event]) return;
      this._handlers[event] = this._handlers[event].filter(h => h !== fn);
    }

    emit(event, data) {
      (this._handlers[event] || []).forEach(fn => fn(data));
    }
  }

  /* ───────────────────────────────────────────
     CORE BOOKING ENGINE
  ─────────────────────────────────────────── */
  class BookingEngine {
    constructor(config = {}) {
      this.config = { ...DEFAULTS, ...config };
      this.events = new EventBus();
      this._ready = false;

      // Choose adapter
      if (config.supabaseUrl && config.supabaseKey) {
        this.adapter = new SupabaseAdapter(config.supabaseUrl, config.supabaseKey, this.config.shopId);
        this.mode = 'supabase';
      } else {
        this.adapter = new LocalAdapter(this.config.storagePrefix);
        this.mode = 'local';
      }
    }

    async init() {
      // Load or seed data
      const services = await this.adapter.getAll('services');
      if (!services || services.length === 0) {
        for (const svc of this.config.services) {
          await this.adapter.insert('services', { ...svc });
        }
      }

      const hours = await this.adapter.getAll('hours');
      if (!hours || (Array.isArray(hours) && hours.length === 0)) {
        if (this.mode === 'local') {
          await this.adapter.setAll('hours', this.config.hours);
        } else {
          for (const [day, data] of Object.entries(this.config.hours)) {
            await this.adapter.insert('hours', { day: parseInt(day), ...data });
          }
        }
      }

      const settings = await this.adapter.getAll('settings');
      if (!settings || (Array.isArray(settings) && settings.length === 0)) {
        if (this.mode === 'local') {
          await this.adapter.setAll('settings', this.config.settings);
        } else {
          await this.adapter.insert('settings', { ...this.config.settings });
        }
      }

      this._ready = true;
      this.events.emit('ready', { mode: this.mode });
      return this;
    }

    /* ── Services ── */

    async getServices(activeOnly = true) {
      const all = await this.adapter.getAll('services') || [];
      return activeOnly ? all.filter(s => s.active !== false) : all;
    }

    async getService(id) {
      const all = await this.adapter.getAll('services') || [];
      return all.find(s => s.id === id) || null;
    }

    async saveService(service) {
      if (service.id) {
        const existing = await this.getService(service.id);
        if (existing) {
          const result = await this.adapter.update('services', service.id, service);
          this.events.emit('service:updated', result);
          return result;
        }
      }
      service.id = service.id || 's' + Date.now();
      service.active = service.active !== false;
      const result = await this.adapter.insert('services', service);
      this.events.emit('service:created', result);
      return result;
    }

    async deleteService(id) {
      await this.adapter.remove('services', id);
      this.events.emit('service:deleted', { id });
    }

    /* ── Hours ── */

    async getHours() {
      const data = await this.adapter.getAll('hours');
      if (Array.isArray(data)) {
        // Supabase: convert array to day-keyed object
        const obj = {};
        data.forEach(h => { obj[h.day] = { open: h.open, from: h.from, to: h.to }; });
        return obj;
      }
      return data || this.config.hours;
    }

    async saveHours(hours) {
      if (this.mode === 'local') {
        await this.adapter.setAll('hours', hours);
      } else {
        for (const [day, data] of Object.entries(hours)) {
          const existing = await this.adapter.query('hours', { day: parseInt(day) });
          if (existing && existing.length > 0) {
            await this.adapter.update('hours', existing[0].id, { ...data });
          } else {
            await this.adapter.insert('hours', { day: parseInt(day), ...data });
          }
        }
      }
      this.events.emit('hours:updated', hours);
    }

    /* ── Settings ── */

    async getSettings() {
      const data = await this.adapter.getAll('settings');
      if (Array.isArray(data) && data.length > 0) return data[0];
      return data || this.config.settings;
    }

    async saveSettings(settings) {
      if (this.mode === 'local') {
        await this.adapter.setAll('settings', settings);
      } else {
        const existing = await this.getSettings();
        if (existing && existing.id) {
          await this.adapter.update('settings', existing.id, settings);
        } else {
          await this.adapter.insert('settings', settings);
        }
      }
      this.events.emit('settings:updated', settings);
    }

    /* ── Appointments ── */

    async getAppointments(filters) {
      return await this.adapter.query('appointments', filters) || [];
    }

    async getAppointment(id) {
      const all = await this.getAppointments();
      return all.find(a => a.id === id) || null;
    }

    async createAppointment(data) {
      const appointment = {
        ...data,
        status: data.status || 'pending',
        created_at: new Date().toISOString()
      };
      const result = await this.adapter.insert('appointments', appointment);
      this.events.emit('appointment:created', result);
      return result;
    }

    async updateAppointment(id, changes) {
      const result = await this.adapter.update('appointments', id, changes);
      this.events.emit('appointment:updated', result);
      return result;
    }

    async deleteAppointment(id) {
      await this.adapter.remove('appointments', id);
      this.events.emit('appointment:deleted', { id });
    }

    /* ── Time Slots ── */

    async getAvailableSlots(date, serviceId) {
      const service = await this.getService(serviceId);
      if (!service) return [];

      const hours = await this.getHours();
      const dayOfWeek = new Date(date).getDay();
      const dayHours = hours[dayOfWeek];

      if (!dayHours || !dayHours.open) return [];

      const settings = await this.getSettings();
      const interval = settings.slotInterval || this.config.slotInterval;

      const [openH, openM] = dayHours.from.split(':').map(Number);
      const [closeH, closeM] = dayHours.to.split(':').map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;

      // Get existing appointments for this date
      const appointments = await this.getAppointments();
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
      const booked = appointments.filter(a =>
        a.date === dateStr && a.status !== 'cancelled'
      );

      const slots = [];
      const now = new Date();
      const isToday = dateStr === now.toISOString().split('T')[0];

      for (let min = openMin; min + service.duration <= closeMin; min += interval) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');

        // Skip past times
        if (isToday) {
          const slotTime = new Date(dateStr + 'T' + timeStr);
          if (slotTime <= now) continue;
        }

        // Check conflicts
        const hasConflict = booked.some(a => {
          const bookedService = this.config.services.find(s => s.id === a.serviceId) || { duration: 30 };
          const [bH, bM] = a.time.split(':').map(Number);
          const bStart = bH * 60 + bM;
          const bEnd = bStart + bookedService.duration;
          const sStart = min;
          const sEnd = min + service.duration;
          return sStart < bEnd && sEnd > bStart;
        });

        if (!hasConflict) {
          slots.push({ time: timeStr, available: true });
        }
      }

      return slots;
    }

    /* ── Stats ── */

    async getStats() {
      const appointments = await this.getAppointments();
      const services = await this.getServices(false);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Start of week (Monday)
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const todayAppts = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');
      const weekAppts = appointments.filter(a =>
        a.date >= weekStartStr && a.date <= weekEndStr && a.status !== 'cancelled'
      );

      let weekRevenue = 0;
      weekAppts.forEach(a => {
        const svc = services.find(s => s.id === a.serviceId);
        if (svc) weekRevenue += svc.price;
      });

      return {
        today: todayAppts.length,
        week: weekAppts.length,
        revenue: weekRevenue,
        serviceCount: services.filter(s => s.active !== false).length,
        todayAppointments: todayAppts.sort((a, b) => a.time.localeCompare(b.time))
      };
    }

    /* ── Helpers ── */

    formatPrice(amount) {
      return amount + ' ' + this.config.currency;
    }

    formatDate(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(this.config.locale, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    formatDateShort(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(this.config.locale, {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    getDayName(dayIndex) {
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      return days[dayIndex];
    }

    getMode() {
      return this.mode;
    }
  }

  /* ───────────────────────────────────────────
     PUBLIC API
  ─────────────────────────────────────────── */
  root.MiroBooking = {
    /**
     * Create and initialize a booking engine instance
     * @param {Object} config
     * @param {string} [config.supabaseUrl] - Supabase project URL
     * @param {string} [config.supabaseKey] - Supabase anon key
     * @param {string} [config.shopId]      - Unique shop identifier
     * @param {string} [config.storagePrefix] - localStorage prefix (default: 'miro_')
     * @returns {BookingEngine}
     */
    create(config) {
      return new BookingEngine(config);
    },

    async init(config) {
      const engine = new BookingEngine(config);
      await engine.init();
      return engine;
    },

    version: '1.0.0'
  };

})(typeof window !== 'undefined' ? window : globalThis);

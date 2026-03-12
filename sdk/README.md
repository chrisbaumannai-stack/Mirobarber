# MIRO Booking SDK v1.0

Standalone, modulares Buchungssystem das in jede Website eingebunden werden kann.

## Quick Start

### 1. Ohne Backend (localStorage)

```html
<script src="sdk/miro-booking.js"></script>
<script>
  const booking = await MiroBooking.init({
    shopId: 'mein-shop',
    storagePrefix: 'mein_'
  });

  // Services laden
  const services = await booking.getServices();

  // Termin erstellen
  await booking.createAppointment({
    serviceId: 's1',
    serviceName: 'Haarschnitt',
    date: '2026-03-15',
    time: '10:00',
    customerName: 'Max Mustermann',
    customerPhone: '+49 170 1234567'
  });
</script>
```

### 2. Mit Supabase Backend

```html
<script src="sdk/miro-booking.js"></script>
<script>
  const booking = await MiroBooking.init({
    supabaseUrl: 'https://xxxx.supabase.co',
    supabaseKey: 'eyJ...',
    shopId: 'mein-shop'
  });
</script>
```

**Supabase Setup:**
1. Erstelle ein Supabase-Projekt unter https://supabase.com
2. Führe `supabase-schema.sql` im SQL Editor aus
3. Kopiere URL und anon key in die Config

## API

### Services
```js
await booking.getServices()           // Alle aktiven Services
await booking.getServices(false)      // Alle Services (inkl. inaktive)
await booking.getService('s1')        // Einzelnen Service laden
await booking.saveService({...})      // Erstellen oder aktualisieren
await booking.deleteService('s1')     // Löschen
```

### Termine
```js
await booking.getAppointments()                    // Alle Termine
await booking.createAppointment({...})             // Neuen Termin
await booking.updateAppointment(id, { status })    // Status ändern
await booking.deleteAppointment(id)                // Löschen
await booking.getAvailableSlots('2026-03-15', 's1') // Freie Slots
```

### Öffnungszeiten
```js
await booking.getHours()         // Öffnungszeiten laden
await booking.saveHours({...})   // Speichern
```

### Settings
```js
await booking.getSettings()         // Einstellungen laden
await booking.saveSettings({...})   // Speichern
```

### Statistiken
```js
const stats = await booking.getStats();
// { today, week, revenue, serviceCount, todayAppointments }
```

### Events
```js
booking.events.on('appointment:created', (appt) => { ... });
booking.events.on('service:updated', (svc) => { ... });
booking.events.on('hours:updated', (hours) => { ... });
```

## Architektur

```
sdk/
├── miro-booking.js      ← SDK (eine Datei, kein Build nötig)
├── supabase-schema.sql  ← Datenbank-Schema
└── README.md

booking/                 ← Buchungs-Widget (nutzt SDK)
├── index.html
├── css/booking.css
└── js/booking.js

admin/                   ← Admin-Dashboard (nutzt SDK)
├── index.html
├── css/dashboard.css
└── js/dashboard.js
```

## Standalone in andere Website einbinden

1. Kopiere den `sdk/` Ordner in dein Projekt
2. Kopiere `booking/` für die Kundenansicht
3. Kopiere `admin/` für das Dashboard
4. Passe die Script-Pfade an
5. Optional: Supabase-Config eintragen für Backend

import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Companies (Entreprises: Clients expéditeurs, Transporteurs/Fournisseurs, Admin)
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'CLIENT', 'CARRIER', 'ADMIN'
  code: text('code').notNull().unique(), // e.g. "CLI-ALG-01", "TRP-SARL-SETIF"
  nif: text('nif'), // Numéro d'Identification Fiscale
  rc: text('rc'), // Registre de Commerce
  address: text('address').notNull(),
  wilaya: text('wilaya').notNull(), // 58 Wilayas algériennes (ex: Alger, Oran, Sétif, etc.)
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  contactPerson: text('contact_person').notNull(),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users (Administrateurs, Gestionnaires Clients, Exploitants Fournisseurs, Chauffeurs)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or internal login identifier
  companyId: integer('company_id').references(() => companies.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'ADMIN', 'CLIENT', 'CARRIER', 'DRIVER'
  phone: text('phone'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED'
  driverLicenseNumber: text('driver_license_number'),
  driverLicenseCategory: text('driver_license_category'), // e.g. 'Poids lourd C / E'
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Trucks (Fiches camions de la flotte)
export const trucks = pgTable('trucks', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id)
    .notNull(), // Transporteur propriétaire
  licensePlate: text('license_plate').notNull().unique(), // Ex: "01842-118-16"
  brandModel: text('brand_model').notNull(), // Ex: "Renault Trucks T520 4x2"
  truckType: text('truck_type').notNull(), // 'PLATEAU', 'FOURGON', 'FRIGORIFIQUE', 'BENNE', 'CITERNE', 'PORTE_CHAR'
  maxTonnage: doublePrecision('max_tonnage').notNull(), // Ex: 25.0 tonnes
  usableVolume: doublePrecision('usable_volume').notNull(), // Ex: 85.0 m3
  defaultDriverId: integer('default_driver_id').references(() => users.id),
  technicalControlExpiry: text('technical_control_expiry'), // JJ/MM/AAAA
  insuranceExpiry: text('insurance_expiry'), // JJ/MM/AAAA
  operationalStatus: text('operational_status').notNull().default('DISPONIBLE'),
  // 'DISPONIBLE', 'RESERVE', 'EN_ATTENTE_CHARGEMENT', 'EN_COURS_CHARGEMENT', 'EN_TRANSIT', 'EN_LIVRAISON', 'EN_RETOUR', 'EN_MAINTENANCE', 'INDISPONIBLE'
  currentWilaya: text('current_wilaya').notNull().default('Alger'),
  currentLocationName: text('current_location_name').default('Dépôt Central'),
  currentLat: doublePrecision('current_lat').default(36.7538),
  currentLng: doublePrecision('current_lng').default(3.0588),
  lastPositionTime: timestamp('last_position_time'),
  nextAvailabilityDate: timestamp('next_availability_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Transport Requests & Bookings (Demandes et Réservations)
export const transportRequests = pgTable('transport_requests', {
  id: serial('id').primaryKey(),
  requestRef: text('request_ref').notNull().unique(), // Ex: "TR-2026-0081"
  clientCompanyId: integer('client_company_id')
    .references(() => companies.id)
    .notNull(),
  carrierCompanyId: integer('carrier_company_id').references(() => companies.id),
  createdByUserId: integer('created_by_user_id')
    .references(() => users.id)
    .notNull(),
  status: text('status').notNull().default('DEMANDE_SOUMISE'),
  // Workflow: 'BROUILLON', 'DEMANDE_SOUMISE', 'EN_ATTENTE_CONFIRMATION', 'REFUSEE', 'CONFIRMEE', 'AFFECTEE',
  // 'EN_ROUTE_CHARGEMENT', 'ARRIVE_QUAI', 'CHARGEMENT_EN_COURS', 'CHARGEMENT_TERMINE', 'BL_VALIDE', 'EN_TRANSIT',
  // 'ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS', 'LIVRE', 'CLOTUREE', 'ANNULEE'
  goodsType: text('goods_type').notNull(), // Ex: "Matériaux de construction", "Agroalimentaire frais"
  quantity: text('quantity').notNull(), // Ex: "28"
  unit: text('unit').notNull().default('palettes'), // 'palettes', 'tonnes', 'colis', 'fardeaux'
  totalWeightTons: doublePrecision('total_weight_tons').notNull(), // Ex: 18.5
  totalVolumeM3: doublePrecision('total_volume_m3'), // Ex: 45.0
  requiredTruckType: text('required_truck_type').notNull(), // 'PLATEAU', 'FOURGON', etc.
  specialInstructions: text('special_instructions'),
  // Pickup info
  pickupAddress: text('pickup_address').notNull(),
  pickupWilaya: text('pickup_wilaya').notNull(),
  pickupDateTime: timestamp('pickup_date_time').notNull(),
  pickupContactName: text('pickup_contact_name').notNull(),
  pickupContactPhone: text('pickup_contact_phone').notNull(),
  pickupLat: doublePrecision('pickup_lat').default(36.7538),
  pickupLng: doublePrecision('pickup_lng').default(3.0588),
  // Delivery info
  deliveryAddress: text('delivery_address').notNull(),
  deliveryWilaya: text('delivery_wilaya').notNull(),
  deliveryDateTime: timestamp('delivery_date_time').notNull(),
  deliveryContactName: text('delivery_contact_name').notNull(),
  deliveryContactPhone: text('delivery_contact_phone').notNull(),
  deliveryLat: doublePrecision('delivery_lat').default(35.6987),
  deliveryLng: doublePrecision('delivery_lng').default(-0.6349),
  // Assignment
  assignedTruckId: integer('assigned_truck_id').references(() => trucks.id),
  assignedDriverId: integer('assigned_driver_id').references(() => users.id),
  refusalReason: text('refusal_reason'),
  cancellationReason: text('cancellation_reason'),
  estimatedDurationHours: doublePrecision('estimated_duration_hours').default(5),
  estimatedDistanceKm: doublePrecision('estimated_distance_km').default(415),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Delivery Notes (Bons de Livraison & Preuves de Livraison POD)
export const deliveryNotes = pgTable('delivery_notes', {
  id: serial('id').primaryKey(),
  transportRequestId: integer('transport_request_id')
    .references(() => transportRequests.id)
    .notNull(),
  blNumber: text('bl_number').notNull(), // Ex: "BL-2026-DZ-994"
  barcodeOrQrData: text('barcode_or_qr_data'),
  docType: text('doc_type').notNull(), // 'BON_DE_LIVRAISON', 'PREUVE_DE_LIVRAISON_POD', 'LETTRE_DE_VOITURE'
  fileUrl: text('file_url'), // Storage or base64 data
  fileName: text('file_name'),
  scannedByUserId: integer('scanned_by_user_id').references(() => users.id),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  verified: boolean('verified').notNull().default(true),
  notes: text('notes'),
  recipientSignature: text('recipient_signature'),
  recipientName: text('recipient_name'),
  recipientTitle: text('recipient_title'),
});

// 6. Transport Events (Historique chronologique et traçabilité inviolable)
export const transportEvents = pgTable('transport_events', {
  id: serial('id').primaryKey(),
  transportRequestId: integer('transport_request_id')
    .references(() => transportRequests.id)
    .notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  comment: text('comment'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  locationName: text('location_name'),
  docRef: text('doc_ref'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// 7. Incidents & Anomalies
export const incidents = pgTable('incidents', {
  id: serial('id').primaryKey(),
  transportRequestId: integer('transport_request_id')
    .references(() => transportRequests.id)
    .notNull(),
  truckId: integer('truck_id').references(() => trucks.id),
  driverId: integer('driver_id').references(() => users.id),
  incidentType: text('incident_type').notNull(),
  // 'RETARD_CHARGEMENT', 'RETARD_LIVRAISON', 'PANNE_MECANIQUE', 'ACCIDENT', 'ANOMALIE_DOCUMENTAIRE', 'LIVRAISON_PARTIELLE', 'METEO_ROUTE_BLOQUEE', 'AUTRE'
  severity: text('severity').notNull().default('MOYENNE'), // 'FAIBLE', 'MOYENNE', 'CRITIQUE'
  description: text('description').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  reportedAt: timestamp('reported_at').defaultNow().notNull(),
  resolved: boolean('resolved').notNull().default(false),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: timestamp('resolved_at'),
});

// 8. GPS Positions (Télémétrie et suivi en temps réel)
export const gpsPositions = pgTable('gps_positions', {
  id: serial('id').primaryKey(),
  transportRequestId: integer('transport_request_id').references(() => transportRequests.id),
  truckId: integer('truck_id')
    .references(() => trucks.id)
    .notNull(),
  driverId: integer('driver_id').references(() => users.id),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  speedKmH: doublePrecision('speed_km_h').default(0),
  headingDeg: doublePrecision('heading_deg').default(0),
  batteryPercent: integer('battery_percent').default(95),
  locationName: text('location_name'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// 9. Notifications (Alertes et jalons opérationnels)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  companyId: integer('company_id').references(() => companies.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('STATUS_CHANGE'),
  // 'REQUEST', 'CONFIRMATION', 'STATUS_CHANGE', 'DELAY', 'INCIDENT', 'DELIVERY', 'SYSTEM'
  read: boolean('read').notNull().default(false),
  transportRequestId: integer('transport_request_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  trucks: many(trucks),
  clientRequests: many(transportRequests, { relationName: 'clientRequests' }),
  carrierRequests: many(transportRequests, { relationName: 'carrierRequests' }),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  assignedRequests: many(transportRequests, { relationName: 'assignedDriver' }),
  createdRequests: many(transportRequests, { relationName: 'requestCreator' }),
  notifications: many(notifications),
}));

export const trucksRelations = relations(trucks, ({ one, many }) => ({
  carrier: one(companies, {
    fields: [trucks.companyId],
    references: [companies.id],
  }),
  defaultDriver: one(users, {
    fields: [trucks.defaultDriverId],
    references: [users.id],
  }),
  transportRequests: many(transportRequests),
  gpsPositions: many(gpsPositions),
  incidents: many(incidents),
}));

export const transportRequestsRelations = relations(transportRequests, ({ one, many }) => ({
  clientCompany: one(companies, {
    fields: [transportRequests.clientCompanyId],
    references: [companies.id],
    relationName: 'clientRequests',
  }),
  carrierCompany: one(companies, {
    fields: [transportRequests.carrierCompanyId],
    references: [companies.id],
    relationName: 'carrierRequests',
  }),
  createdByUser: one(users, {
    fields: [transportRequests.createdByUserId],
    references: [users.id],
    relationName: 'requestCreator',
  }),
  assignedTruck: one(trucks, {
    fields: [transportRequests.assignedTruckId],
    references: [trucks.id],
  }),
  assignedDriver: one(users, {
    fields: [transportRequests.assignedDriverId],
    references: [users.id],
    relationName: 'assignedDriver',
  }),
  deliveryNotes: many(deliveryNotes),
  events: many(transportEvents),
  incidents: many(incidents),
  gpsPositions: many(gpsPositions),
}));

export const deliveryNotesRelations = relations(deliveryNotes, ({ one }) => ({
  transportRequest: one(transportRequests, {
    fields: [deliveryNotes.transportRequestId],
    references: [transportRequests.id],
  }),
  scannedByUser: one(users, {
    fields: [deliveryNotes.scannedByUserId],
    references: [users.id],
  }),
}));

export const transportEventsRelations = relations(transportEvents, ({ one }) => ({
  transportRequest: one(transportRequests, {
    fields: [transportEvents.transportRequestId],
    references: [transportRequests.id],
  }),
  user: one(users, {
    fields: [transportEvents.userId],
    references: [users.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  transportRequest: one(transportRequests, {
    fields: [incidents.transportRequestId],
    references: [transportRequests.id],
  }),
  truck: one(trucks, {
    fields: [incidents.truckId],
    references: [trucks.id],
  }),
  driver: one(users, {
    fields: [incidents.driverId],
    references: [users.id],
  }),
}));

export const gpsPositionsRelations = relations(gpsPositions, ({ one }) => ({
  transportRequest: one(transportRequests, {
    fields: [gpsPositions.transportRequestId],
    references: [transportRequests.id],
  }),
  truck: one(trucks, {
    fields: [gpsPositions.truckId],
    references: [trucks.id],
  }),
  driver: one(users, {
    fields: [gpsPositions.driverId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
}));

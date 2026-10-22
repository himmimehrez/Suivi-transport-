export type UserRole = 'ADMIN' | 'CLIENT' | 'CARRIER' | 'DRIVER';

export type TruckType =
  | 'PLATEAU'
  | 'FOURGON'
  | 'FRIGORIFIQUE'
  | 'BENNE'
  | 'CITERNE'
  | 'PORTE_CHAR';

export type TruckStatus =
  | 'DISPONIBLE'
  | 'RESERVE'
  | 'EN_ATTENTE_CHARGEMENT'
  | 'EN_COURS_CHARGEMENT'
  | 'EN_TRANSIT'
  | 'EN_LIVRAISON'
  | 'EN_RETOUR'
  | 'EN_MAINTENANCE'
  | 'INDISPONIBLE';

export type RequestStatus =
  | 'BROUILLON'
  | 'DEMANDE_SOUMISE'
  | 'EN_ATTENTE_CONFIRMATION'
  | 'REFUSEE'
  | 'CONFIRMEE'
  | 'AFFECTEE'
  | 'EN_ROUTE_CHARGEMENT'
  | 'ARRIVE_QUAI'
  | 'CHARGEMENT_EN_COURS'
  | 'CHARGEMENT_TERMINE'
  | 'BL_VALIDE'
  | 'EN_TRANSIT'
  | 'ARRIVE_DESTINATION'
  | 'LIVRAISON_EN_COURS'
  | 'LIVRE'
  | 'CLOTUREE'
  | 'ANNULEE';

export interface Company {
  id: number;
  name: string;
  type: 'CLIENT' | 'CARRIER' | 'ADMIN';
  code: string;
  nif?: string | null;
  rc?: string | null;
  address: string;
  wilaya: string;
  phone: string;
  email: string;
  contactPerson: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: number | null;
  company?: Company | null;
  phone?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  driverLicenseNumber?: string | null;
  driverLicenseCategory?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Truck {
  id: number;
  companyId: number;
  carrier?: Company | null;
  licensePlate: string;
  brandModel: string;
  truckType: TruckType;
  maxTonnage: number;
  usableVolume: number;
  defaultDriverId?: number | null;
  defaultDriver?: User | null;
  technicalControlExpiry?: string | null;
  insuranceExpiry?: string | null;
  operationalStatus: TruckStatus;
  currentWilaya: string;
  currentLocationName?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastPositionTime?: string | null;
  nextAvailabilityDate?: string | null;
  isActive: boolean;
  isAvailableForPeriod?: boolean;
  conflictDetails?: any;
  createdAt: string;
}

export interface TransportRequest {
  id: number;
  requestRef: string;
  clientCompanyId: number;
  clientCompany?: Company | null;
  carrierCompanyId?: number | null;
  carrierCompany?: Company | null;
  createdByUserId: number;
  createdByUser?: User | null;
  status: RequestStatus;
  goodsType: string;
  quantity: string;
  unit: string;
  totalWeightTons: number;
  totalVolumeM3?: number | null;
  requiredTruckType: TruckType;
  specialInstructions?: string | null;
  pickupAddress: string;
  pickupWilaya: string;
  pickupDateTime: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryAddress: string;
  deliveryWilaya: string;
  deliveryDateTime: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  assignedTruckId?: number | null;
  assignedTruck?: Truck | null;
  assignedDriverId?: number | null;
  assignedDriver?: User | null;
  refusalReason?: string | null;
  cancellationReason?: string | null;
  estimatedDurationHours?: number | null;
  estimatedDistanceKm?: number | null;
  deliveryNotes?: DeliveryNote[];
  events?: TransportEvent[];
  incidents?: Incident[];
  gpsPositions?: GpsPosition[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNote {
  id: number;
  transportRequestId: number;
  blNumber: string;
  barcodeOrQrData?: string | null;
  docType: 'BON_DE_LIVRAISON' | 'PREUVE_DE_LIVRAISON_POD' | 'LETTRE_DE_VOITURE';
  fileUrl?: string | null;
  fileName?: string | null;
  scannedByUserId?: number | null;
  scannedAt: string;
  verified: boolean;
  notes?: string | null;
  recipientSignature?: string | null;
  recipientName?: string | null;
  recipientTitle?: string | null;
}

export interface TransportEvent {
  id: number;
  transportRequestId: number;
  previousStatus?: string | null;
  newStatus: string;
  userId?: number | null;
  userName: string;
  userRole: string;
  comment?: string | null;
  lat?: number | null;
  lng?: number | null;
  locationName?: string | null;
  docRef?: string | null;
  timestamp: string;
}

export interface Incident {
  id: number;
  transportRequestId: number;
  truckId?: number | null;
  driverId?: number | null;
  incidentType: string;
  severity: 'FAIBLE' | 'MOYENNE' | 'CRITIQUE';
  description: string;
  lat?: number | null;
  lng?: number | null;
  reportedAt: string;
  resolved: boolean;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
}

export interface GpsPosition {
  id: number;
  transportRequestId?: number | null;
  truckId: number;
  driverId?: number | null;
  lat: number;
  lng: number;
  speedKmH?: number | null;
  headingDeg?: number | null;
  batteryPercent?: number | null;
  locationName?: string | null;
  recordedAt: string;
}

export interface NotificationItem {
  id: number;
  userId?: number | null;
  companyId?: number | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  transportRequestId?: number | null;
  createdAt: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  confirmedBookings: number;
  loadingMissions: number;
  inTransitMissions: number;
  deliveredMissions: number;
  activeIncidentsCount: number;
  totalTrucks: number;
  availableTrucks: number;
  reservedTrucks: number;
  transitTrucks: number;
  maintenanceTrucks: number;
}

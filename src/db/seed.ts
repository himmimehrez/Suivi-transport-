import { db } from './index.ts';
import {
  companies,
  users,
  trucks,
  transportRequests,
  deliveryNotes,
  transportEvents,
  incidents,
  gpsPositions,
  notifications,
} from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabaseIfEmpty() {
  try {
    const existingCompanies = await db.select().from(companies).limit(1);
    if (existingCompanies.length > 0) {
      console.log('Database already seeded. Skipping initial seed.');
      return;
    }

    console.log('Seeding initial demonstration data for TransLog Algérie...');

    // 1. Companies
    const [adminCo] = await db
      .insert(companies)
      .values({
        name: 'TransLog Direction Générale Algérie',
        type: 'ADMIN',
        code: 'ADM-DZ-01',
        nif: '001916010048293',
        rc: '16/00-0982314B19',
        address: '14 Boulevard Zighout Youcef, Alger Centre',
        wilaya: 'Alger',
        phone: '+213 21 73 40 12',
        email: 'direction@translog.dz',
        contactPerson: 'Amine Kaci (Directeur Général)',
        status: 'ACTIVE',
      })
      .returning();

    const [client1Co] = await db
      .insert(companies)
      .values({
        name: 'Sider El Hadjar & Métallurgie SPA',
        type: 'CLIENT',
        code: 'CLI-SIDER-01',
        nif: '000223010148192',
        rc: '23/00-0145293B02',
        address: 'Zone Industrielle El Hadjar, BP 1024',
        wilaya: 'Annaba',
        phone: '+213 38 88 12 34',
        email: 'logistique@sider-annaba.dz',
        contactPerson: 'Hassan Mansouri (Chef Logistique Usine)',
        status: 'ACTIVE',
      })
      .returning();

    const [client2Co] = await db
      .insert(companies)
      .values({
        name: 'Cevital Agro-Alimentaire SPA',
        type: 'CLIENT',
        code: 'CLI-CEV-02',
        nif: '000606010058291',
        rc: '06/00-0391823B06',
        address: 'Nouveau Port de Béjaïa, Quai Agro',
        wilaya: 'Béjaïa',
        phone: '+213 34 21 44 80',
        email: 'appro@cevital-agro.dz',
        contactPerson: 'Leila Bouzid (Resp. Expéditions Nationales)',
        status: 'ACTIVE',
      })
      .returning();

    const [carrier1Co] = await db
      .insert(companies)
      .values({
        name: 'SNTR Transports & Logistique Sétif',
        type: 'CARRIER',
        code: 'TRP-SNTR-19',
        nif: '000119010023491',
        rc: '19/00-0481920B19',
        address: 'Zone Industrielle Bel-Air, Sétif',
        wilaya: 'Sétif',
        phone: '+213 36 92 10 05',
        email: 'exploitation@sntr-setif.dz',
        contactPerson: 'Djamel Rahmouni (Responsable Exploitation Flotte)',
        status: 'ACTIVE',
      })
      .returning();

    const [carrier2Co] = await db
      .insert(companies)
      .values({
        name: 'Maghreb Express Fret & Camions SARL',
        type: 'CARRIER',
        code: 'TRP-MAGHREB-16',
        nif: '001516010091824',
        rc: '16/00-0918237B15',
        address: 'Zone d’Activité Oued Smar, Alger',
        wilaya: 'Alger',
        phone: '+213 23 93 45 60',
        email: 'dispo@maghreb-logistique.dz',
        contactPerson: 'Sofiane Benabderrahmane (Gestionnaire Parc)',
        status: 'ACTIVE',
      })
      .returning();

    // 2. Users for all roles
    const [adminUser] = await db
      .insert(users)
      .values({
        uid: 'demo-admin-uid-01',
        email: 'admin@translog.dz',
        name: 'Mahrez Hammadi (Admin Général)',
        role: 'ADMIN',
        companyId: adminCo.id,
        phone: '+213 550 12 34 56',
        status: 'ACTIVE',
      })
      .returning();

    const [client1User] = await db
      .insert(users)
      .values({
        uid: 'demo-client1-uid-01',
        email: 'logistique@sider-annaba.dz',
        name: 'Hassan Mansouri (Sider Annaba)',
        role: 'CLIENT',
        companyId: client1Co.id,
        phone: '+213 661 22 33 44',
        status: 'ACTIVE',
      })
      .returning();

    const [client2User] = await db
      .insert(users)
      .values({
        uid: 'demo-client2-uid-02',
        email: 'appro@cevital-agro.dz',
        name: 'Leila Bouzid (Cevital Agro)',
        role: 'CLIENT',
        companyId: client2Co.id,
        phone: '+213 770 99 88 77',
        status: 'ACTIVE',
      })
      .returning();

    const [carrier1User] = await db
      .insert(users)
      .values({
        uid: 'demo-carrier1-uid-01',
        email: 'exploitation@sntr-setif.dz',
        name: 'Djamel Rahmouni (SNTR Sétif)',
        role: 'CARRIER',
        companyId: carrier1Co.id,
        phone: '+213 555 44 33 22',
        status: 'ACTIVE',
      })
      .returning();

    const [carrier2User] = await db
      .insert(users)
      .values({
        uid: 'demo-carrier2-uid-02',
        email: 'dispo@maghreb-logistique.dz',
        name: 'Sofiane Benabderrahmane (Maghreb Express)',
        role: 'CARRIER',
        companyId: carrier2Co.id,
        phone: '+213 560 77 66 55',
        status: 'ACTIVE',
      })
      .returning();

    // Drivers
    const [driver1] = await db
      .insert(users)
      .values({
        uid: 'demo-driver1-uid-01',
        email: 'karim.benali@chauffeur.dz',
        name: 'Karim Benali',
        role: 'DRIVER',
        companyId: carrier1Co.id,
        phone: '+213 551 88 99 01',
        driverLicenseNumber: 'DZ-19-982410',
        driverLicenseCategory: 'Poids Lourd C, E (Super-lourd)',
        status: 'ACTIVE',
      })
      .returning();

    const [driver2] = await db
      .insert(users)
      .values({
        uid: 'demo-driver2-uid-02',
        email: 'mourad.zerrouki@chauffeur.dz',
        name: 'Mourad Zerrouki',
        role: 'DRIVER',
        companyId: carrier1Co.id,
        phone: '+213 552 11 22 33',
        driverLicenseNumber: 'DZ-19-741258',
        driverLicenseCategory: 'Poids Lourd C, E',
        status: 'ACTIVE',
      })
      .returning();

    const [driver3] = await db
      .insert(users)
      .values({
        uid: 'demo-driver3-uid-03',
        email: 'yacine.mansouri@chauffeur.dz',
        name: 'Yacine Mansouri',
        role: 'DRIVER',
        companyId: carrier2Co.id,
        phone: '+213 554 99 88 11',
        driverLicenseNumber: 'DZ-16-654321',
        driverLicenseCategory: 'Poids Lourd C, ADR Matières Dangereuses',
        status: 'ACTIVE',
      })
      .returning();

    // 3. Trucks Fleet
    const [truck1] = await db
      .insert(trucks)
      .values({
        companyId: carrier1Co.id,
        licensePlate: '01842-118-19',
        brandModel: 'Renault Trucks T520 4x2 Semi-Remorque',
        truckType: 'PLATEAU',
        maxTonnage: 28.0,
        usableVolume: 85.0,
        defaultDriverId: driver1.id,
        technicalControlExpiry: '15/12/2026',
        insuranceExpiry: '30/11/2026',
        operationalStatus: 'EN_TRANSIT',
        currentWilaya: 'Chlef',
        currentLocationName: 'Autoroute Est-Ouest PK 214 (Chlef vers Oran)',
        currentLat: 36.1652,
        currentLng: 1.3345,
        lastPositionTime: new Date(Date.now() - 1000 * 60 * 12), // 12 min ago
        nextAvailabilityDate: new Date(Date.now() + 1000 * 60 * 60 * 8), // in 8 hours
        isActive: true,
      })
      .returning();

    const [truck2] = await db
      .insert(trucks)
      .values({
        companyId: carrier1Co.id,
        licensePlate: '02914-121-19',
        brandModel: 'Volvo FH 500 Globetrotter',
        truckType: 'FRIGORIFIQUE',
        maxTonnage: 22.0,
        usableVolume: 78.0,
        defaultDriverId: driver2.id,
        technicalControlExpiry: '20/09/2026',
        insuranceExpiry: '15/10/2026',
        operationalStatus: 'EN_COURS_CHARGEMENT',
        currentWilaya: 'Béjaïa',
        currentLocationName: 'Quai N°3, Complexe Agroalimentaire Cevital Béjaïa',
        currentLat: 36.7511,
        currentLng: 5.0567,
        lastPositionTime: new Date(Date.now() - 1000 * 60 * 5),
        nextAvailabilityDate: new Date(Date.now() + 1000 * 60 * 60 * 14),
        isActive: true,
      })
      .returning();

    const [truck3] = await db
      .insert(trucks)
      .values({
        companyId: carrier1Co.id,
        licensePlate: '00543-120-19',
        brandModel: 'Mercedes-Benz Actros 3340 Benne 6x4',
        truckType: 'BENNE',
        maxTonnage: 32.0,
        usableVolume: 40.0,
        defaultDriverId: null,
        technicalControlExpiry: '04/05/2026',
        insuranceExpiry: '18/06/2026',
        operationalStatus: 'DISPONIBLE',
        currentWilaya: 'Sétif',
        currentLocationName: 'Parc Principal SNTR Sétif ZI Bel-Air',
        currentLat: 36.1911,
        currentLng: 5.4137,
        lastPositionTime: new Date(Date.now() - 1000 * 60 * 45),
        nextAvailabilityDate: new Date(),
        isActive: true,
      })
      .returning();

    const [truck4] = await db
      .insert(trucks)
      .values({
        companyId: carrier2Co.id,
        licensePlate: '11492-122-16',
        brandModel: 'MAN TGX 18.480 Fourgon Fermé',
        truckType: 'FOURGON',
        maxTonnage: 20.0,
        usableVolume: 90.0,
        defaultDriverId: driver3.id,
        technicalControlExpiry: '10/01/2027',
        insuranceExpiry: '28/02/2027',
        operationalStatus: 'DISPONIBLE',
        currentWilaya: 'Alger',
        currentLocationName: 'Plateforme Logistique Oued Smar Alger',
        currentLat: 36.7025,
        currentLng: 3.1611,
        lastPositionTime: new Date(Date.now() - 1000 * 60 * 25),
        nextAvailabilityDate: new Date(),
        isActive: true,
      })
      .returning();

    const [truck5] = await db
      .insert(trucks)
      .values({
        companyId: carrier2Co.id,
        licensePlate: '09812-119-16',
        brandModel: 'Scania R450 Citerne Inox Alimentaire',
        truckType: 'CITERNE',
        maxTonnage: 26.0,
        usableVolume: 32.0,
        defaultDriverId: null,
        technicalControlExpiry: '14/11/2026',
        insuranceExpiry: '30/12/2026',
        operationalStatus: 'EN_MAINTENANCE',
        currentWilaya: 'Alger',
        currentLocationName: 'Atelier Mécanique Rouïba Alger',
        currentLat: 36.7389,
        currentLng: 3.2844,
        lastPositionTime: new Date(Date.now() - 1000 * 60 * 120),
        nextAvailabilityDate: new Date(Date.now() + 1000 * 60 * 60 * 48), // in 2 days
        isActive: true,
      })
      .returning();

    // 4. Transport Requests (Realistic Algerian Freight Operations)
    // Mission 1: En Transit (Alger -> Oran)
    const [req1] = await db
      .insert(transportRequests)
      .values({
        requestRef: 'TR-2026-DZ-0101',
        clientCompanyId: client1Co.id,
        carrierCompanyId: carrier1Co.id,
        createdByUserId: client1User.id,
        status: 'EN_TRANSIT',
        goodsType: 'Bobines d’acier galvanisé & Profilés métalliques',
        quantity: '6 bobines industrielles',
        unit: 'fardeaux',
        totalWeightTons: 24.5,
        totalVolumeM3: 35.0,
        requiredTruckType: 'PLATEAU',
        specialInstructions: 'Arrimage par sangles haute résistance obligatoire. Bâche de protection en cas de pluie.',
        pickupAddress: 'Dépôt Central Sider, Port d’Alger Quai 18',
        pickupWilaya: 'Alger',
        pickupDateTime: new Date(Date.now() - 1000 * 60 * 60 * 6),
        pickupContactName: 'Mourad Kaddour (Chef de Quai)',
        pickupContactPhone: '+213 550 44 22 11',
        pickupLat: 36.7725,
        pickupLng: 3.0645,
        deliveryAddress: 'Zone Industrielle Es Sénia, Oran',
        deliveryWilaya: 'Oran',
        deliveryDateTime: new Date(Date.now() + 1000 * 60 * 60 * 4),
        deliveryContactName: 'Brahim Larbi (Réception Magasin)',
        deliveryContactPhone: '+213 551 33 88 99',
        deliveryLat: 35.6512,
        deliveryLng: -0.6214,
        assignedTruckId: truck1.id,
        assignedDriverId: driver1.id,
        estimatedDurationHours: 6.5,
        estimatedDistanceKm: 420.0,
      })
      .returning();

    // Mission 2: Chargement en cours (Béjaïa -> Sétif)
    const [req2] = await db
      .insert(transportRequests)
      .values({
        requestRef: 'TR-2026-DZ-0102',
        clientCompanyId: client2Co.id,
        carrierCompanyId: carrier1Co.id,
        createdByUserId: client2User.id,
        status: 'CHARGEMENT_EN_COURS',
        goodsType: 'Margarine industrielle et huiles de table raffinées',
        quantity: '26 palettes sous film thermo-rétractable',
        unit: 'palettes',
        totalWeightTons: 19.8,
        totalVolumeM3: 65.0,
        requiredTruckType: 'FRIGORIFIQUE',
        specialInstructions: 'Maintien de la chaîne du froid à +14°C constant. Enregistreur de température actif.',
        pickupAddress: 'Complexe Cevital, Quai Agroalimentaire, Béjaïa',
        pickupWilaya: 'Béjaïa',
        pickupDateTime: new Date(Date.now() - 1000 * 60 * 90),
        pickupContactName: 'Nadia Cherif (Contrôle Qualité Expéditions)',
        pickupContactPhone: '+213 554 11 22 88',
        pickupLat: 36.7511,
        pickupLng: 5.0567,
        deliveryAddress: 'Plateforme Distribution Régionale SNTR, Sétif',
        deliveryWilaya: 'Sétif',
        deliveryDateTime: new Date(Date.now() + 1000 * 60 * 60 * 6),
        deliveryContactName: 'Kamel Belkacem (Gestionnaire Entrepôt)',
        deliveryContactPhone: '+213 560 33 44 55',
        deliveryLat: 36.1911,
        deliveryLng: 5.4137,
        assignedTruckId: truck2.id,
        assignedDriverId: driver2.id,
        estimatedDurationHours: 3.5,
        estimatedDistanceKm: 110.0,
      })
      .returning();

    // Mission 3: Demande soumise (Annaba -> Alger, en attente de réponse transporteur)
    const [req3] = await db
      .insert(transportRequests)
      .values({
        requestRef: 'TR-2026-DZ-0103',
        clientCompanyId: client1Co.id,
        carrierCompanyId: carrier2Co.id,
        createdByUserId: client1User.id,
        status: 'DEMANDE_SOUMISE',
        goodsType: 'Tôles laminées à chaud et tubes sans soudure',
        quantity: '18 tonnes nettes',
        unit: 'tonnes',
        totalWeightTons: 18.0,
        totalVolumeM3: 25.0,
        requiredTruckType: 'PLATEAU',
        specialInstructions: 'Accès par le portail poids lourd Nord de l’usine El Hadjar.',
        pickupAddress: 'Usine Sider Complexe El Hadjar, Annaba',
        pickupWilaya: 'Annaba',
        pickupDateTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
        pickupContactName: 'Hassan Mansouri',
        pickupContactPhone: '+213 661 22 33 44',
        pickupLat: 36.7989,
        pickupLng: 7.7289,
        deliveryAddress: 'Chantier Tramway / Métro Oued Smar, Alger',
        deliveryWilaya: 'Alger',
        deliveryDateTime: new Date(Date.now() + 1000 * 60 * 60 * 36),
        deliveryContactName: 'Omar Benali (Chef de Projet Génie Civil)',
        deliveryContactPhone: '+213 559 12 34 56',
        deliveryLat: 36.7025,
        deliveryLng: 3.1611,
        estimatedDurationHours: 7.5,
        estimatedDistanceKm: 580.0,
      })
      .returning();

    // Mission 4: Livrée avec succès & POD (Alger -> Blida)
    const [req4] = await db
      .insert(transportRequests)
      .values({
        requestRef: 'TR-2026-DZ-0100',
        clientCompanyId: client2Co.id,
        carrierCompanyId: carrier2Co.id,
        createdByUserId: client2User.id,
        status: 'LIVRE',
        goodsType: 'Farine pâtissière et semoule fine en sacs de 25kg',
        quantity: '800 sacs (20 palettes)',
        unit: 'palettes',
        totalWeightTons: 20.0,
        totalVolumeM3: 45.0,
        requiredTruckType: 'FOURGON',
        specialInstructions: 'Déchargement par chariot élévateur au quai B.',
        pickupAddress: 'Silo Agroalimentaire Cevital Rouïba, Alger',
        pickupWilaya: 'Alger',
        pickupDateTime: new Date(Date.now() - 1000 * 60 * 60 * 28),
        pickupContactName: 'Tariq Messous',
        pickupContactPhone: '+213 551 22 00 33',
        pickupLat: 36.7389,
        pickupLng: 3.2844,
        deliveryAddress: 'Zone d’Activité Ben Boulaid, Blida',
        deliveryWilaya: 'Blida',
        deliveryDateTime: new Date(Date.now() - 1000 * 60 * 60 * 20),
        deliveryContactName: 'Samir Boukhalfa (Directeur Centre Distribution)',
        deliveryContactPhone: '+213 553 44 77 99',
        deliveryLat: 36.4703,
        deliveryLng: 2.8288,
        assignedTruckId: truck4.id,
        assignedDriverId: driver3.id,
        estimatedDurationHours: 1.5,
        estimatedDistanceKm: 55.0,
      })
      .returning();

    // 5. Delivery Notes (BL & Preuves de Livraison POD)
    // BL pour req1 (en transit)
    await db.insert(deliveryNotes).values({
      transportRequestId: req1.id,
      blNumber: 'BL-ALG-2026-0941',
      barcodeOrQrData: 'BL-ALG-2026-0941|TR-2026-DZ-0101|SIDER|24.5T',
      docType: 'BON_DE_LIVRAISON',
      fileName: 'Bon_Livraison_Sider_0941.pdf',
      scannedByUserId: driver1.id,
      scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      verified: true,
      notes: '6 bobines acier chargées et inspectées. Bâche arrimée.',
      recipientName: 'Brahim Larbi (Destinataire Oran)',
    });

    // BL pour req2 (chargement en cours)
    await db.insert(deliveryNotes).values({
      transportRequestId: req2.id,
      blNumber: 'BL-CEV-2026-1180',
      barcodeOrQrData: 'BL-CEV-2026-1180|TR-2026-DZ-0102|CEVITAL|19.8T',
      docType: 'BON_DE_LIVRAISON',
      fileName: 'Bon_Livraison_Cevital_1180.pdf',
      scannedByUserId: driver2.id,
      scannedAt: new Date(Date.now() - 1000 * 60 * 30),
      verified: true,
      notes: 'Palettes vérifiées, température remorque vérifiée à +13.8°C.',
      recipientName: 'Kamel Belkacem (SNTR Sétif)',
    });

    // POD complet pour req4 (livré)
    await db.insert(deliveryNotes).values({
      transportRequestId: req4.id,
      blNumber: 'BL-CEV-2026-0814',
      barcodeOrQrData: 'BL-CEV-2026-0814|TR-2026-DZ-0100|CEVITAL|20T',
      docType: 'PREUVE_DE_LIVRAISON_POD',
      fileName: 'Preuve_Livraison_Signee_Blida.pdf',
      scannedByUserId: driver3.id,
      scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
      verified: true,
      notes: 'Livraison 800 sacs effectuée sans aucune réserve. Émargement client conforme.',
      recipientSignature: 'Samir Boukhalfa [Signé électroniquement]',
      recipientName: 'Samir Boukhalfa',
      recipientTitle: 'Directeur Logistique Centre',
    });

    // 6. Chronological Transport Events (Inviolable Audit Trail)
    await db.insert(transportEvents).values([
      {
        transportRequestId: req1.id,
        previousStatus: 'BROUILLON',
        newStatus: 'DEMANDE_SOUMISE',
        userId: client1User.id,
        userName: client1User.name,
        userRole: 'CLIENT',
        comment: 'Demande créée pour expédition urgente d’acier vers Oran.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'DEMANDE_SOUMISE',
        newStatus: 'CONFIRMEE',
        userId: carrier1User.id,
        userName: carrier1User.name,
        userRole: 'CARRIER',
        comment: 'Réservation validée par le service exploitation SNTR.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'CONFIRMEE',
        newStatus: 'AFFECTEE',
        userId: carrier1User.id,
        userName: carrier1User.name,
        userRole: 'CARRIER',
        comment: 'Camion 01842-118-19 et chauffeur Karim Benali affectés.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'AFFECTEE',
        newStatus: 'ARRIVE_QUAI',
        userId: driver1.id,
        userName: driver1.name,
        userRole: 'DRIVER',
        comment: 'Présentation au poste de garde Port d’Alger Quai 18.',
        lat: 36.7725,
        lng: 3.0645,
        locationName: 'Port d’Alger',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'ARRIVE_QUAI',
        newStatus: 'CHARGEMENT_TERMINE',
        userId: driver1.id,
        userName: driver1.name,
        userRole: 'DRIVER',
        comment: 'Chargement des 6 bobines terminé. Sangles vérifiées.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4.5),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'CHARGEMENT_TERMINE',
        newStatus: 'BL_VALIDE',
        userId: driver1.id,
        userName: driver1.name,
        userRole: 'DRIVER',
        comment: 'Bon de livraison BL-ALG-2026-0941 scanné avec succès.',
        docRef: 'BL-ALG-2026-0941',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
      {
        transportRequestId: req1.id,
        previousStatus: 'BL_VALIDE',
        newStatus: 'EN_TRANSIT',
        userId: driver1.id,
        userName: driver1.name,
        userRole: 'DRIVER',
        comment: 'Départ du port d’Alger en direction d’Oran via Autoroute Est-Ouest.',
        lat: 36.7725,
        lng: 3.0645,
        locationName: 'Alger Centre',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.8),
      },
    ]);

    // 7. GPS Position Telemetry along Highway
    await db.insert(gpsPositions).values([
      {
        transportRequestId: req1.id,
        truckId: truck1.id,
        driverId: driver1.id,
        lat: 36.7725,
        lng: 3.0645,
        speedKmH: 30.0,
        headingDeg: 240.0,
        locationName: 'Port d’Alger (Départ)',
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 3.5),
      },
      {
        transportRequestId: req1.id,
        truckId: truck1.id,
        driverId: driver1.id,
        lat: 36.4703,
        lng: 2.8288,
        speedKmH: 78.0,
        headingDeg: 250.0,
        locationName: 'Contournement Blida / Mouzaïa',
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5),
      },
      {
        transportRequestId: req1.id,
        truckId: truck1.id,
        driverId: driver1.id,
        lat: 36.2625,
        lng: 2.2154,
        speedKmH: 74.0,
        headingDeg: 255.0,
        locationName: 'Autoroute A1, Ain Defla',
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.2),
      },
      {
        transportRequestId: req1.id,
        truckId: truck1.id,
        driverId: driver1.id,
        lat: 36.1652,
        lng: 1.3345,
        speedKmH: 75.0,
        headingDeg: 260.0,
        locationName: 'Autoroute A1 PK 214, Chlef (Position Actuelle)',
        recordedAt: new Date(Date.now() - 1000 * 60 * 12),
      },
    ]);

    // 8. Incidents (Realistic Logistical Anomaly)
    await db.insert(incidents).values({
      transportRequestId: req1.id,
      truckId: truck1.id,
      driverId: driver1.id,
      incidentType: 'RETARD_CHARGEMENT',
      severity: 'FAIBLE',
      description: 'Ralentissement au contrôle douanier du port d’Alger (+45 min). Retard absorbable sur autoroute.',
      lat: 36.7725,
      lng: 3.0645,
      reportedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      resolved: true,
      resolutionNotes: 'Contrôle validé par l’inspecteur de douane. Départ effectué.',
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    });

    // 9. Notifications
    await db.insert(notifications).values([
      {
        companyId: client1Co.id,
        userId: client1User.id,
        title: 'Mission TR-2026-DZ-0101 en route',
        message: 'Le camion 01842-118-19 a quitté le port d’Alger. Arrivée estimée à Oran vers 17h30.',
        type: 'STATUS_CHANGE',
        read: false,
        transportRequestId: req1.id,
      },
      {
        companyId: carrier1Co.id,
        userId: carrier1User.id,
        title: 'Bon de Livraison validé',
        message: 'Le chauffeur Karim Benali a téléversé le BL-ALG-2026-0941 avec succès.',
        type: 'CONFIRMATION',
        read: true,
        transportRequestId: req1.id,
      },
      {
        companyId: carrier2Co.id,
        userId: carrier2User.id,
        title: 'Nouvelle demande de transport reçue',
        message: 'Sider El Hadjar a soumis une demande TR-2026-DZ-0103 (Annaba -> Alger, 18T). Réponse requise.',
        type: 'REQUEST',
        read: false,
        transportRequestId: req3.id,
      },
    ]);

    console.log('TransLog Algérie demonstration data successfully seeded!');
  } catch (error) {
    console.error('Error during initial database seed:', error);
  }
}

import { Router, Response } from 'express';
import { db } from '../db/index.ts';
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
} from '../db/schema.ts';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { checkTruckConflict, createNotification, logTransportEvent } from './db-service.ts';
import { seedDatabaseIfEmpty } from '../db/seed.ts';

const api = Router();

// 1. Current User & Demo Users
api.get('/auth/me', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    // Return first demo admin or client as default
    const firstUser = await db.select().from(users).limit(1);
    if (firstUser.length > 0) {
      const co = firstUser[0].companyId
        ? await db.select().from(companies).where(eq(companies.id, firstUser[0].companyId)).limit(1)
        : [];
      return res.json({
        user: firstUser[0],
        company: co[0] || null,
        isGuest: false,
      });
    }
    return res.status(401).json({ error: 'Non authentifié' });
  }

  let userCompany = null;
  if (req.user.companyId) {
    const cos = await db.select().from(companies).where(eq(companies.id, req.user.companyId)).limit(1);
    if (cos.length > 0) userCompany = cos[0];
  }

  res.json({
    user: req.user,
    company: userCompany,
    isGuest: false,
  });
});

api.get('/auth/demo-users', async (_req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allCompanies = await db.select().from(companies);
    const companyMap = new Map(allCompanies.map((c) => [c.id, c]));

    const enriched = allUsers.map((u) => ({
      ...u,
      company: u.companyId ? companyMap.get(u.companyId) : null,
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Dashboard KPIs
api.get('/dashboard/stats', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const role = user?.role || 'ADMIN';
    const companyId = user?.companyId;

    let requestFilter = sql`1=1`;
    let truckFilter = sql`1=1`;

    if (role === 'CLIENT' && companyId) {
      requestFilter = eq(transportRequests.clientCompanyId, companyId);
    } else if (role === 'CARRIER' && companyId) {
      requestFilter = or(
        eq(transportRequests.carrierCompanyId, companyId),
        sql`${transportRequests.carrierCompanyId} IS NULL AND ${transportRequests.status} = 'DEMANDE_SOUMISE'`
      )!;
      truckFilter = eq(trucks.companyId, companyId);
    } else if (role === 'DRIVER' && user?.id) {
      requestFilter = eq(transportRequests.assignedDriverId, user.id);
    }

    const allReqs = await db.select().from(transportRequests).where(requestFilter);
    const allTrucksList = await db.select().from(trucks).where(truckFilter);
    const activeIncidents = await db.select().from(incidents).where(eq(incidents.resolved, false));

    const stats = {
      totalRequests: allReqs.length,
      pendingRequests: allReqs.filter((r) =>
        ['DEMANDE_SOUMISE', 'EN_ATTENTE_CONFIRMATION'].includes(r.status)
      ).length,
      confirmedBookings: allReqs.filter((r) =>
        ['CONFIRMEE', 'AFFECTEE'].includes(r.status)
      ).length,
      loadingMissions: allReqs.filter((r) =>
        ['ARRIVE_QUAI', 'CHARGEMENT_EN_COURS', 'CHARGEMENT_TERMINE'].includes(r.status)
      ).length,
      inTransitMissions: allReqs.filter((r) =>
        ['EN_ROUTE_CHARGEMENT', 'BL_VALIDE', 'EN_TRANSIT', 'ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS'].includes(r.status)
      ).length,
      deliveredMissions: allReqs.filter((r) =>
        ['LIVRE', 'CLOTUREE'].includes(r.status)
      ).length,
      activeIncidentsCount: activeIncidents.length,

      // Fleet breakdown
      totalTrucks: allTrucksList.length,
      availableTrucks: allTrucksList.filter((t) => t.operationalStatus === 'DISPONIBLE').length,
      reservedTrucks: allTrucksList.filter((t) => t.operationalStatus === 'RESERVE').length,
      transitTrucks: allTrucksList.filter((t) =>
        ['EN_TRANSIT', 'EN_LIVRAISON', 'EN_COURS_CHARGEMENT'].includes(t.operationalStatus)
      ).length,
      maintenanceTrucks: allTrucksList.filter((t) =>
        ['EN_MAINTENANCE', 'INDISPONIBLE'].includes(t.operationalStatus)
      ).length,
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Companies
api.get('/companies', async (_req, res) => {
  try {
    const list = await db.select().from(companies).orderBy(companies.name);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/companies', async (req: AuthRequest, res) => {
  try {
    if (req.user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Seul l’administrateur général peut créer une entreprise.' });
    }
    const { name, type, code, nif, rc, address, wilaya, phone, email, contactPerson } = req.body;
    const [created] = await db
      .insert(companies)
      .values({
        name,
        type,
        code,
        nif,
        rc,
        address,
        wilaya,
        phone,
        email,
        contactPerson,
        status: 'ACTIVE',
      })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.patch('/companies/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Action réservée à l’administrateur.' });
    }
    const id = parseInt(req.params.id, 10);
    const [updated] = await db.update(companies).set(req.body).where(eq(companies.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Users
api.get('/users', async (_req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.name);
    const allCos = await db.select().from(companies);
    const coMap = new Map(allCos.map((c) => [c.id, c]));
    const mapped = allUsers.map((u) => ({
      ...u,
      company: u.companyId ? coMap.get(u.companyId) : null,
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/users', async (req: AuthRequest, res) => {
  try {
    if (req.user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Action réservée à l’administrateur.' });
    }
    const { name, email, role, companyId, phone, driverLicenseNumber, driverLicenseCategory } = req.body;
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [created] = await db
      .insert(users)
      .values({
        uid,
        name,
        email,
        role,
        companyId: companyId ? parseInt(companyId, 10) : null,
        phone,
        driverLicenseNumber,
        driverLicenseCategory,
        status: 'ACTIVE',
      })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (req.user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Action réservée à l’administrateur.' });
    }
    const id = parseInt(req.params.id, 10);
    const [updated] = await db.update(users).set(req.body).where(eq(users.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Trucks Fleet
api.get('/trucks', async (req: AuthRequest, res) => {
  try {
    const { carrierId, truckType, minTonnage, pickupDate, deliveryDate } = req.query;
    let query = db.select().from(trucks);

    const conditions = [];
    if (carrierId) {
      conditions.push(eq(trucks.companyId, parseInt(carrierId as string, 10)));
    }
    if (truckType && truckType !== 'ALL') {
      conditions.push(eq(trucks.truckType, truckType as string));
    }
    if (minTonnage) {
      conditions.push(sql`${trucks.maxTonnage} >= ${parseFloat(minTonnage as string)}`);
    }

    const truckList = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    // Attach company and driver info, and compute dynamic availability if dates provided
    const allCos = await db.select().from(companies);
    const coMap = new Map(allCos.map((c) => [c.id, c]));
    const allDrivers = await db.select().from(users).where(eq(users.role, 'DRIVER'));
    const driverMap = new Map(allDrivers.map((d) => [d.id, d]));

    const pDate = pickupDate ? new Date(pickupDate as string) : null;
    const dDate = deliveryDate ? new Date(deliveryDate as string) : null;

    const enriched = await Promise.all(
      truckList.map(async (t) => {
        let isAvailableForPeriod = t.operationalStatus === 'DISPONIBLE' && t.isActive;
        let conflictDetails = null;

        if (pDate && dDate && !isNaN(pDate.getTime()) && !isNaN(dDate.getTime())) {
          const conflict = await checkTruckConflict(t.id, pDate, dDate);
          if (conflict.hasConflict) {
            isAvailableForPeriod = false;
            conflictDetails = conflict.conflictingRequest;
          }
        }

        return {
          ...t,
          carrier: coMap.get(t.companyId) || null,
          defaultDriver: t.defaultDriverId ? driverMap.get(t.defaultDriverId) : null,
          isAvailableForPeriod,
          conflictDetails,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/trucks', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (user && !['ADMIN', 'CARRIER'].includes(user.role)) {
      return res.status(403).json({ error: 'Non autorisé à ajouter un camion.' });
    }

    const {
      licensePlate,
      brandModel,
      truckType,
      maxTonnage,
      usableVolume,
      companyId,
      defaultDriverId,
      technicalControlExpiry,
      insuranceExpiry,
      currentWilaya,
      currentLocationName,
    } = req.body;

    const targetCompanyId = user?.role === 'CARRIER' ? user.companyId : companyId;
    if (!targetCompanyId) {
      return res.status(400).json({ error: 'L’entreprise propriétaire du camion est requise.' });
    }

    const [created] = await db
      .insert(trucks)
      .values({
        companyId: targetCompanyId,
        licensePlate,
        brandModel,
        truckType,
        maxTonnage: parseFloat(maxTonnage),
        usableVolume: parseFloat(usableVolume || '0'),
        defaultDriverId: defaultDriverId ? parseInt(defaultDriverId, 10) : null,
        technicalControlExpiry,
        insuranceExpiry,
        operationalStatus: 'DISPONIBLE',
        currentWilaya: currentWilaya || 'Alger',
        currentLocationName: currentLocationName || 'Dépôt Principal',
        isActive: true,
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.patch('/trucks/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db.update(trucks).set(req.body).where(eq(trucks.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Transport Requests & Workflow
api.get('/transport-requests', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const role = user?.role || 'ADMIN';
    const companyId = user?.companyId;

    let filter = sql`1=1`;
    if (role === 'CLIENT' && companyId) {
      filter = eq(transportRequests.clientCompanyId, companyId);
    } else if (role === 'CARRIER' && companyId) {
      filter = or(
        eq(transportRequests.carrierCompanyId, companyId),
        sql`${transportRequests.carrierCompanyId} IS NULL AND ${transportRequests.status} = 'DEMANDE_SOUMISE'`
      )!;
    } else if (role === 'DRIVER' && user?.id) {
      filter = eq(transportRequests.assignedDriverId, user.id);
    }

    const list = await db
      .select()
      .from(transportRequests)
      .where(filter)
      .orderBy(desc(transportRequests.createdAt));

    // Attach companies, trucks, drivers
    const allCos = await db.select().from(companies);
    const coMap = new Map(allCos.map((c) => [c.id, c]));
    const allTrucks = await db.select().from(trucks);
    const truckMap = new Map(allTrucks.map((t) => [t.id, t]));
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enriched = list.map((r) => ({
      ...r,
      clientCompany: coMap.get(r.clientCompanyId) || null,
      carrierCompany: r.carrierCompanyId ? coMap.get(r.carrierCompanyId) : null,
      assignedTruck: r.assignedTruckId ? truckMap.get(r.assignedTruckId) : null,
      assignedDriver: r.assignedDriverId ? userMap.get(r.assignedDriverId) : null,
      createdByUser: userMap.get(r.createdByUserId) || null,
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/transport-requests', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (user && user.role !== 'CLIENT' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Seuls les clients ou administrateurs peuvent initier une demande.' });
    }

    const {
      clientCompanyId,
      carrierCompanyId,
      goodsType,
      quantity,
      unit,
      totalWeightTons,
      totalVolumeM3,
      requiredTruckType,
      specialInstructions,
      pickupAddress,
      pickupWilaya,
      pickupDateTime,
      pickupContactName,
      pickupContactPhone,
      pickupLat,
      pickupLng,
      deliveryAddress,
      deliveryWilaya,
      deliveryDateTime,
      deliveryContactName,
      deliveryContactPhone,
      deliveryLat,
      deliveryLng,
      status,
      selectedTruckId,
    } = req.body;

    const clientId = user?.role === 'CLIENT' ? user.companyId! : clientCompanyId;
    const creatorId = user?.id || 1;

    // Automatic reference generation
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestRef = `TR-2026-DZ-${randomSuffix}`;

    const [created] = await db
      .insert(transportRequests)
      .values({
        requestRef,
        clientCompanyId: clientId,
        carrierCompanyId: carrierCompanyId ? parseInt(carrierCompanyId, 10) : null,
        createdByUserId: creatorId,
        status: status || 'DEMANDE_SOUMISE',
        goodsType,
        quantity: String(quantity),
        unit: unit || 'palettes',
        totalWeightTons: parseFloat(totalWeightTons),
        totalVolumeM3: totalVolumeM3 ? parseFloat(totalVolumeM3) : null,
        requiredTruckType,
        specialInstructions,
        pickupAddress,
        pickupWilaya,
        pickupDateTime: new Date(pickupDateTime),
        pickupContactName,
        pickupContactPhone,
        pickupLat: pickupLat ? parseFloat(pickupLat) : 36.7538,
        pickupLng: pickupLng ? parseFloat(pickupLng) : 3.0588,
        deliveryAddress,
        deliveryWilaya,
        deliveryDateTime: new Date(deliveryDateTime),
        deliveryContactName,
        deliveryContactPhone,
        deliveryLat: deliveryLat ? parseFloat(deliveryLat) : 35.6987,
        deliveryLng: deliveryLng ? parseFloat(deliveryLng) : -0.6349,
        assignedTruckId: selectedTruckId ? parseInt(selectedTruckId, 10) : null,
      })
      .returning();

    // Event audit trail
    if (user) {
      await logTransportEvent(
        created.id,
        null,
        created.status,
        user,
        `Demande de transport créée pour ${goodsType} (${totalWeightTons}T).`
      );
    }

    // Notify carrier if specified
    if (created.carrierCompanyId) {
      await createNotification(
        created.carrierCompanyId,
        null,
        'Nouvelle demande de transport',
        `Une nouvelle expédition ${requestRef} a été soumise (${goodsType}, ${totalWeightTons}T).`,
        'REQUEST',
        created.id
      );
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/transport-requests/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reqList = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (reqList.length === 0) {
      return res.status(404).json({ error: 'Mission introuvable.' });
    }

    const item = reqList[0];
    const user = req.user;

    // Strict multi-company data privacy check
    if (user && user.role !== 'ADMIN') {
      if (user.role === 'CLIENT' && user.companyId !== item.clientCompanyId) {
        return res.status(403).json({ error: 'Accès non autorisé aux données de cette entreprise.' });
      }
      if (user.role === 'CARRIER' && item.carrierCompanyId && user.companyId !== item.carrierCompanyId) {
        return res.status(403).json({ error: 'Accès non autorisé aux données de cette entreprise.' });
      }
      if (user.role === 'DRIVER' && item.assignedDriverId !== user.id) {
        return res.status(403).json({ error: 'Cette mission ne vous est pas affectée.' });
      }
    }

    // Attach all related items
    const [clientCo] = await db.select().from(companies).where(eq(companies.id, item.clientCompanyId)).limit(1);
    const carrierCo = item.carrierCompanyId
      ? (await db.select().from(companies).where(eq(companies.id, item.carrierCompanyId)).limit(1))[0]
      : null;
    const assignedTruck = item.assignedTruckId
      ? (await db.select().from(trucks).where(eq(trucks.id, item.assignedTruckId)).limit(1))[0]
      : null;
    const assignedDriver = item.assignedDriverId
      ? (await db.select().from(users).where(eq(users.id, item.assignedDriverId)).limit(1))[0]
      : null;
    const notes = await db.select().from(deliveryNotes).where(eq(deliveryNotes.transportRequestId, id));
    const events = await db
      .select()
      .from(transportEvents)
      .where(eq(transportEvents.transportRequestId, id))
      .orderBy(desc(transportEvents.timestamp));
    const reqIncidents = await db.select().from(incidents).where(eq(incidents.transportRequestId, id));
    const positions = await db
      .select()
      .from(gpsPositions)
      .where(eq(gpsPositions.transportRequestId, id))
      .orderBy(desc(gpsPositions.recordedAt))
      .limit(50);

    res.json({
      ...item,
      clientCompany: clientCo,
      carrierCompany: carrierCo,
      assignedTruck,
      assignedDriver,
      deliveryNotes: notes,
      events,
      incidents: reqIncidents,
      gpsPositions: positions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Workflow Transition (Strict Role & State Machine Rules)
api.post('/transport-requests/:id/status', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { newStatus, comment, lat, lng, locationName, docRef } = req.body;
    const user = req.user;

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) {
      return res.status(404).json({ error: 'Mission introuvable.' });
    }

    const previousStatus = currentReq.status;

    // Business Workflow Validation Rules:
    // Chauffeur permissions
    if (user?.role === 'DRIVER') {
      if (currentReq.assignedDriverId !== user.id) {
        return res.status(403).json({ error: 'Vous ne pouvez pas modifier une mission qui ne vous est pas affectée.' });
      }
      // Cannot deliver before departing
      if (['LIVRE', 'LIVRAISON_EN_COURS'].includes(newStatus) && !['EN_TRANSIT', 'ARRIVE_DESTINATION'].includes(previousStatus)) {
        return res.status(400).json({ error: 'Règle métier: Le camion doit être parti et en transit avant de déclarer la livraison.' });
      }
      // Driver cannot close the mission administratively
      if (newStatus === 'CLOTUREE') {
        return res.status(403).json({ error: 'Seul le transporteur ou le client peut clôturer administrativement la mission.' });
      }
    }

    // Update transport request status
    const [updatedReq] = await db
      .update(transportRequests)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(transportRequests.id, id))
      .returning();

    // Side-effects on Truck operational status & availability
    if (currentReq.assignedTruckId) {
      let truckOpStatus = 'DISPONIBLE';
      if (['CONFIRMEE', 'AFFECTEE'].includes(newStatus)) {
        truckOpStatus = 'RESERVE';
      } else if (newStatus === 'ARRIVE_QUAI') {
        truckOpStatus = 'EN_ATTENTE_CHARGEMENT';
      } else if (newStatus === 'CHARGEMENT_EN_COURS') {
        truckOpStatus = 'EN_COURS_CHARGEMENT';
      } else if (['CHARGEMENT_TERMINE', 'BL_VALIDE', 'EN_TRANSIT'].includes(newStatus)) {
        truckOpStatus = 'EN_TRANSIT';
      } else if (['ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS'].includes(newStatus)) {
        truckOpStatus = 'EN_LIVRAISON';
      } else if (['LIVRE', 'CLOTUREE'].includes(newStatus)) {
        truckOpStatus = 'DISPONIBLE';
      }

      await db
        .update(trucks)
        .set({
          operationalStatus: truckOpStatus,
          currentLat: lat || undefined,
          currentLng: lng || undefined,
          currentLocationName: locationName || undefined,
          lastPositionTime: lat ? new Date() : undefined,
          nextAvailabilityDate: ['LIVRE', 'CLOTUREE'].includes(newStatus) ? new Date() : undefined,
        })
        .where(eq(trucks.id, currentReq.assignedTruckId));
    }

    // Log tamper-evident audit event
    if (user) {
      await logTransportEvent(
        id,
        previousStatus,
        newStatus,
        user,
        comment,
        lat,
        lng,
        locationName,
        docRef
      );
    }

    // Generate notifications
    const targetCompany = user?.role === 'CARRIER' || user?.role === 'DRIVER'
      ? currentReq.clientCompanyId
      : currentReq.carrierCompanyId;

    if (targetCompany) {
      await createNotification(
        targetCompany,
        null,
        `Mission ${currentReq.requestRef}: Changement de statut`,
        `Le statut est passé à : ${newStatus}. ${comment || ''}`,
        'STATUS_CHANGE',
        id
      );
    }

    res.json(updatedReq);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Carrier Assignment (Truck & Driver) with Concurrent Collision Check
api.post('/transport-requests/:id/assign', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { truckId, driverId } = req.body;
    const user = req.user;

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) {
      return res.status(404).json({ error: 'Mission introuvable.' });
    }

    const tId = parseInt(truckId, 10);
    const dId = parseInt(driverId, 10);

    // Conflict Check: Double-booking prevention
    const conflict = await checkTruckConflict(
      tId,
      new Date(currentReq.pickupDateTime),
      new Date(currentReq.deliveryDateTime),
      id
    );

    if (conflict.hasConflict) {
      return res.status(409).json({
        error: `Conflit de disponibilité: Ce camion est déjà affecté à la mission ${conflict.conflictingRequest.requestRef} sur ce créneau.`,
      });
    }

    // Update assignment
    const [updated] = await db
      .update(transportRequests)
      .set({
        assignedTruckId: tId,
        assignedDriverId: dId,
        status: 'AFFECTEE',
        carrierCompanyId: user?.companyId || currentReq.carrierCompanyId,
        updatedAt: new Date(),
      })
      .where(eq(transportRequests.id, id))
      .returning();

    // Mark truck as reserved
    await db
      .update(trucks)
      .set({ operationalStatus: 'RESERVE' })
      .where(eq(trucks.id, tId));

    if (user) {
      await logTransportEvent(
        id,
        currentReq.status,
        'AFFECTEE',
        user,
        `Camion et chauffeur affectés à la mission.`
      );
    }

    // Notify client
    await createNotification(
      currentReq.clientCompanyId,
      null,
      'Ressources affectées',
      `Votre expédition ${currentReq.requestRef} a un camion et un chauffeur confirmés.`,
      'CONFIRMATION',
      id
    );

    // Notify driver
    await createNotification(
      null,
      dId,
      'Nouvelle mission affectée',
      `Vous avez été affecté à la mission ${currentReq.requestRef} (${currentReq.pickupWilaya} -> ${currentReq.deliveryWilaya}).`,
      'REQUEST',
      id
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Carrier Refusal
api.post('/transport-requests/:id/refuse', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const user = req.user;

    if (!reason) {
      return res.status(400).json({ error: 'Le motif du refus est obligatoire.' });
    }

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) return res.status(404).json({ error: 'Mission introuvable.' });

    const [updated] = await db
      .update(transportRequests)
      .set({
        status: 'REFUSEE',
        refusalReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(transportRequests.id, id))
      .returning();

    if (user) {
      await logTransportEvent(
        id,
        currentReq.status,
        'REFUSEE',
        user,
        `Demande refusée par le transporteur. Motif: ${reason}`
      );
    }

    await createNotification(
      currentReq.clientCompanyId,
      null,
      'Demande de transport refusée',
      `La demande ${currentReq.requestRef} a été déclinée. Motif : ${reason}`,
      'STATUS_CHANGE',
      id
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Documents (BL Scan & POD)
api.post('/transport-requests/:id/documents', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      blNumber,
      barcodeOrQrData,
      docType,
      fileName,
      fileUrl,
      notes,
      recipientName,
      recipientSignature,
      recipientTitle,
    } = req.body;
    const user = req.user;

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) return res.status(404).json({ error: 'Mission introuvable.' });

    // Validate that document matches mission if QR/Barcode reference detected
    if (barcodeOrQrData && barcodeOrQrData.includes('TR-')) {
      if (!barcodeOrQrData.includes(currentReq.requestRef)) {
        return res.status(400).json({
          error: `Erreur de concordance documentaire: Le code scanné correspond à une autre mission ou référence que ${currentReq.requestRef}.`,
        });
      }
    }

    const [doc] = await db
      .insert(deliveryNotes)
      .values({
        transportRequestId: id,
        blNumber: blNumber || `BL-${Date.now()}`,
        barcodeOrQrData,
        docType: docType || 'BON_DE_LIVRAISON',
        fileName: fileName || `${docType || 'Document'}.pdf`,
        fileUrl: fileUrl || null,
        scannedByUserId: user?.id || null,
        scannedAt: new Date(),
        verified: true,
        notes,
        recipientName,
        recipientSignature,
        recipientTitle,
      })
      .returning();

    // If POD (proof of delivery), auto-advance mission to LIVRE if delivery signed
    if (docType === 'PREUVE_DE_LIVRAISON_POD') {
      await db
        .update(transportRequests)
        .set({ status: 'LIVRE', updatedAt: new Date() })
        .where(eq(transportRequests.id, id));

      if (currentReq.assignedTruckId) {
        await db
          .update(trucks)
          .set({ operationalStatus: 'DISPONIBLE', nextAvailabilityDate: new Date() })
          .where(eq(trucks.id, currentReq.assignedTruckId));
      }

      if (user) {
        await logTransportEvent(
          id,
          currentReq.status,
          'LIVRE',
          user,
          `Preuve de livraison (POD) validée. Signataire: ${recipientName || 'Client'}.`,
          undefined,
          undefined,
          undefined,
          doc.blNumber
        );
      }
    } else {
      // BL scan step
      await db
        .update(transportRequests)
        .set({ status: 'BL_VALIDE', updatedAt: new Date() })
        .where(eq(transportRequests.id, id));

      if (user) {
        await logTransportEvent(
          id,
          currentReq.status,
          'BL_VALIDE',
          user,
          `Bon de livraison ${doc.blNumber} enregistré et vérifié.`,
          undefined,
          undefined,
          undefined,
          doc.blNumber
        );
      }
    }

    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. GPS Telemetry Stream
api.post('/transport-requests/:id/gps', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { lat, lng, speedKmH, headingDeg, batteryPercent, locationName } = req.body;
    const user = req.user;

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) return res.status(404).json({ error: 'Mission introuvable.' });

    const truckId = currentReq.assignedTruckId;
    if (!truckId) {
      return res.status(400).json({ error: 'Aucun camion affecté à cette mission.' });
    }

    const [pos] = await db
      .insert(gpsPositions)
      .values({
        transportRequestId: id,
        truckId,
        driverId: user?.id || currentReq.assignedDriverId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speedKmH: speedKmH ? parseFloat(speedKmH) : 0,
        headingDeg: headingDeg ? parseFloat(headingDeg) : 0,
        batteryPercent: batteryPercent ? parseInt(batteryPercent, 10) : 90,
        locationName,
        recordedAt: new Date(),
      })
      .returning();

    // Update truck latest position
    await db
      .update(trucks)
      .set({
        currentLat: parseFloat(lat),
        currentLng: parseFloat(lng),
        currentLocationName: locationName,
        lastPositionTime: new Date(),
      })
      .where(eq(trucks.id, truckId));

    res.status(201).json(pos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Incidents & Anomalies
api.post('/transport-requests/:id/incidents', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { incidentType, severity, description, lat, lng } = req.body;
    const user = req.user;

    const [currentReq] = await db.select().from(transportRequests).where(eq(transportRequests.id, id)).limit(1);
    if (!currentReq) return res.status(404).json({ error: 'Mission introuvable.' });

    const [inc] = await db
      .insert(incidents)
      .values({
        transportRequestId: id,
        truckId: currentReq.assignedTruckId,
        driverId: user?.id || currentReq.assignedDriverId,
        incidentType,
        severity: severity || 'MOYENNE',
        description,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        reportedAt: new Date(),
        resolved: false,
      })
      .returning();

    if (user) {
      await logTransportEvent(
        id,
        currentReq.status,
        currentReq.status,
        user,
        `Signalement incident [${incidentType} - Gravité ${severity}]: ${description}`,
        lat,
        lng
      );
    }

    // Alert both carrier and client
    if (currentReq.carrierCompanyId) {
      await createNotification(
        currentReq.carrierCompanyId,
        null,
        `ALERTE: Incident sur ${currentReq.requestRef}`,
        `Type: ${incidentType}. ${description}`,
        'INCIDENT',
        id
      );
    }
    await createNotification(
      currentReq.clientCompanyId,
      null,
      `Alerte incident sur votre livraison ${currentReq.requestRef}`,
      `Type: ${incidentType}. ${description}`,
      'INCIDENT',
      id
    );

    res.status(201).json(inc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Notifications
api.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    let list;
    if (user?.companyId) {
      list = await db
        .select()
        .from(notifications)
        .where(
          or(
            eq(notifications.companyId, user.companyId),
            user.id ? eq(notifications.userId, user.id) : sql`1=0`
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(30);
    } else {
      list = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30);
    }
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.patch('/notifications/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Reset/Reseed Data Endpoint for effortless demonstration
api.post('/system/reset-demo', async (_req, res) => {
  try {
    // Delete in reverse FK order
    await db.delete(notifications);
    await db.delete(incidents);
    await db.delete(gpsPositions);
    await db.delete(transportEvents);
    await db.delete(deliveryNotes);
    await db.delete(transportRequests);
    await db.delete(trucks);
    await db.delete(users);
    await db.delete(companies);

    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Base de données réinitialisée avec succès avec les données de test.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default api;

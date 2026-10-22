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
import { eq, and, or, desc, sql, gte, lte } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/auth.ts';

export async function checkTruckConflict(
  truckId: number,
  pickupDate: Date,
  deliveryDate: Date,
  excludeRequestId?: number
): Promise<{ hasConflict: boolean; conflictingRequest?: any }> {
  // Add 2 hours buffer for return/turnaround
  const bufferMs = 2 * 60 * 60 * 1000;
  const startWithBuffer = new Date(pickupDate.getTime() - bufferMs);
  const endWithBuffer = new Date(deliveryDate.getTime() + bufferMs);

  const activeMissions = await db
    .select()
    .from(transportRequests)
    .where(
      and(
        eq(transportRequests.assignedTruckId, truckId),
        sql`${transportRequests.status} IN ('CONFIRMEE', 'AFFECTEE', 'EN_ROUTE_CHARGEMENT', 'ARRIVE_QUAI', 'CHARGEMENT_EN_COURS', 'CHARGEMENT_TERMINE', 'BL_VALIDE', 'EN_TRANSIT', 'ARRIVE_DESTINATION', 'LIVRAISON_EN_COURS')`,
        excludeRequestId ? sql`${transportRequests.id} != ${excludeRequestId}` : sql`1=1`
      )
    );

  for (const m of activeMissions) {
    const mStart = new Date(m.pickupDateTime).getTime();
    const mEnd = new Date(m.deliveryDateTime).getTime() + bufferMs;

    const reqStart = startWithBuffer.getTime();
    const reqEnd = endWithBuffer.getTime();

    // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
    if (reqStart <= mEnd && reqEnd >= mStart) {
      return { hasConflict: true, conflictingRequest: m };
    }
  }

  return { hasConflict: false };
}

export async function createNotification(
  companyId: number | null,
  userId: number | null,
  title: string,
  message: string,
  type: string,
  transportRequestId?: number
) {
  try {
    await db.insert(notifications).values({
      companyId,
      userId,
      title,
      message,
      type,
      read: false,
      transportRequestId,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export async function logTransportEvent(
  transportRequestId: number,
  previousStatus: string | null,
  newStatus: string,
  user: AuthenticatedUser,
  comment?: string,
  lat?: number,
  lng?: number,
  locationName?: string,
  docRef?: string
) {
  return await db.insert(transportEvents).values({
    transportRequestId,
    previousStatus,
    newStatus,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    comment,
    lat,
    lng,
    locationName,
    docRef,
  });
}

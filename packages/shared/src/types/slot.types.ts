import { SlotStatus } from '../constants/enums';

/** A single computed slot in an availability response. */
export interface IAvailabilitySlot {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: SlotStatus;
  price: number; // peak or base price for this slot, in INR
}

/** Court-sport header included with availability results. */
export interface IAvailabilityCourtSport {
  id: string;
  sportName: string;
  pricePerSlot: number; // base price, in INR
}

/**
 * Availability for a court-sport on a specific date.
 * Matches docs/2.3-api-design.md §9. Reused by the Sprint 5 public endpoint.
 */
export interface IAvailabilityResponse {
  date: string; // "YYYY-MM-DD"
  courtSport: IAvailabilityCourtSport;
  slots: IAvailabilitySlot[];
}

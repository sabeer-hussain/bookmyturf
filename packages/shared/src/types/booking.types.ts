import { BookingStatus, BookingSource, SlotStatus } from '../constants/enums';

export interface IBooking {
  id: string;
  tenantId: string;
  courtSportId: string;
  customerId: string;
  bookingDate: string;
  totalAmount: number;
  finalAmount: number;
  status: BookingStatus;
  source: BookingSource;
  slots: IBookingSlot[];
}

export interface IBookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface ISlotAvailability {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  price: number;
}

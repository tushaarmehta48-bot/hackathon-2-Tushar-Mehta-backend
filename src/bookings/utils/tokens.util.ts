import { randomBytes } from 'node:crypto';

export function generateBookingReference() {
  return `EP-${randomBytes(5).toString('hex').toUpperCase()}`;
}

export function generateTicketCode() {
  return randomBytes(8).toString('hex').toUpperCase();
}

export function generateQrToken() {
  return randomBytes(24).toString('base64url');
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { toBookingSummary, toTicketPublic } from '../bookings/bookings.mapper.js';
import { EventsService } from '../events/events.service.js';
import { toPublicEvent } from '../events/events.mapper.js';
import type { EventDocument } from '../events/schemas/event.schema.js';
import { TicketPackagesService } from '../events/ticket-packages.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { AgentSessionService } from './agent-session.service.js';
import { agentToolResult, formatInrMinor } from './agent-tool-response.js';
import type {
  CreateBookingToolDto,
  EventIdToolDto,
  ListEventsToolDto,
  QuoteBookingToolDto,
  SignInAttendeeToolDto,
} from './dto/agent-tools.dto.js';

@Injectable()
export class AgentToolsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly packagesService: TicketPackagesService,
    private readonly bookingsService: BookingsService,
    private readonly authService: AuthService,
    private readonly agentSessions: AgentSessionService,
  ) {}

  async listEvents(dto: ListEventsToolDto) {
    const query: { category?: string; from?: Date } = {};
    if (dto.category?.trim()) {
      query.category = dto.category.trim();
    }
    if (dto.fromDate?.trim()) {
      const parsed = new Date(dto.fromDate.trim());
      if (!Number.isNaN(parsed.getTime())) {
        query.from = parsed;
      }
    }

    const events = await this.eventsService.listPublic(query);
    const rows = events.map((event) => {
      const pub = toPublicEvent(event as EventDocument);
      return {
        id: pub.id,
        title: pub.title,
        category: pub.category,
        venue: pub.venue,
        startAt: pub.startAt,
      };
    });

    if (rows.length === 0) {
      return agentToolResult(
        'No published events match that filter right now.',
        { events: [] },
      );
    }

    const lines = rows.map(
      (e, i) =>
        `${i + 1}) ${e.title} — ${e.venue} (eventId: ${e.id}, category: ${e.category})`,
    );
    return agentToolResult(
      `Found ${rows.length} event(s):\n${lines.join('\n')}`,
      { events: rows },
    );
  }

  async listEventPackages(dto: EventIdToolDto) {
    const { packages } = await this.packagesService.getPublicPackagesForEvent(
      dto.eventId,
    );
    if (packages.length === 0) {
      return agentToolResult('No ticket packages are on sale for this event.', {
        packages: [],
      });
    }

    const rows = packages.map((p) => ({
      packageId: p.id,
      name: p.name,
      priceMinor: p.priceMinor,
      priceDisplay: formatInrMinor(p.priceMinor),
      quantityRemaining: p.quantityRemaining,
      onSale: p.onSale,
    }));

    const lines = rows.map(
      (p, i) =>
        `${i + 1}) ${p.name} — ${p.priceDisplay}, ${p.quantityRemaining} left (packageId: ${p.packageId})`,
    );
    return agentToolResult(
      `Packages for this event:\n${lines.join('\n')}`,
      { eventId: dto.eventId, packages: rows },
    );
  }

  async signInAttendee(dto: SignInAttendeeToolDto) {
    let user;
    try {
      user = await this.authService.login({
        email: dto.email,
        password: dto.password,
        intendedRole: UserRole.Attendee,
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid email or password, or this account is not an attendee.',
      );
    }

    const agentSessionToken = await this.agentSessions.createForUser(user.id);
    return agentToolResult(
      `Signed in as ${user.name}. You can now quote and book tickets for this guest.`,
      {
        agentSessionToken,
        attendee: { id: user.id, name: user.name, email: user.email },
      },
    );
  }

  async quoteBooking(dto: QuoteBookingToolDto) {
    const userId = await this.agentSessions.resolveUserId(dto.agentSessionToken);
    const quote = await this.bookingsService.quote(userId, {
      eventId: dto.eventId,
      items: [{ packageId: dto.packageId, quantity: dto.quantity }],
    });

    return agentToolResult(
      `Quote for ${dto.quantity} ticket(s): ${formatInrMinor(quote.totalMinor)} total. Read this to the guest and ask them to confirm before booking.`,
      {
        eventId: quote.eventId,
        packageId: dto.packageId,
        quantity: dto.quantity,
        totalMinor: quote.totalMinor,
        totalDisplay: formatInrMinor(quote.totalMinor),
        items: quote.items.map((item) => ({
          packageName: item.packageName,
          quantity: item.quantity,
          lineTotalDisplay: formatInrMinor(item.lineTotalMinor),
        })),
      },
    );
  }

  async createBooking(dto: CreateBookingToolDto) {
    if (!dto.userConfirmed) {
      throw new BadRequestException(
        'Guest must confirm the quote first. Set userConfirmed to true only after they say yes.',
      );
    }

    const userId = await this.agentSessions.resolveUserId(dto.agentSessionToken);
    const { booking, tickets } = await this.bookingsService.create(userId, {
      eventId: dto.eventId,
      items: [{ packageId: dto.packageId, quantity: dto.quantity }],
    });

    const summary = toBookingSummary(booking);
    return agentToolResult(
      `Booking confirmed! Reference ${summary.reference}. ${tickets.length} ticket(s) issued. Tell the guest to open My Bookings on EventPulse for QR codes.`,
      {
        booking: summary,
        tickets: tickets.map(toTicketPublic),
      },
    );
  }

  async listMyBookings(agentSessionToken: string) {
    const userId = await this.agentSessions.resolveUserId(agentSessionToken);
    const bookings = await this.bookingsService.listMine(userId);
    const rows = bookings.map(toBookingSummary);
    if (rows.length === 0) {
      return agentToolResult('This guest has no bookings yet.', { bookings: [] });
    }

    const lines = rows.map(
      (b, i) =>
        `${i + 1}) ref ${b.reference} — ${formatInrMinor(b.totalMinor)} (${b.status})`,
    );
    return agentToolResult(`Bookings:\n${lines.join('\n')}`, { bookings: rows });
  }
}

import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service.js';
import { EventsService } from '../events/events.service.js';
import { TicketPackagesService } from '../events/ticket-packages.service.js';
import { AssistantState } from './assistant.state.js';
import type { AssistantTurnDto } from './dto/assistant-turn.dto.js';

export type AssistantTurnResponse = {
  state: AssistantState;
  templateKey: string;
  locale: 'en' | 'hi';
  data: Record<string, unknown>;
};

@Injectable()
export class AssistantService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly packagesService: TicketPackagesService,
    private readonly bookingsService: BookingsService,
  ) {}

  async turn(userId: string, dto: AssistantTurnDto): Promise<AssistantTurnResponse> {
    const locale = dto.locale ?? 'en';
    const message = dto.message?.trim().toLowerCase() ?? '';
    const context = dto.context ?? {};

    switch (dto.state) {
      case AssistantState.Idle:
      case AssistantState.Listening:
        return this.searchEvents(locale);

      case AssistantState.SelectingEvent: {
        const eventId = context.eventId ?? this.extractEventId(message);
        if (!eventId) {
          return this.error(locale, 'assistant.error.missing_event');
        }
        const packages = await this.packagesService.getPublicPackagesForEvent(
          eventId,
        );
        return {
          state: AssistantState.CollectingDetails,
          templateKey: 'assistant.packages.list',
          locale,
          data: { eventId, packages: packages.packages },
        };
      }

      case AssistantState.CollectingDetails: {
        const eventId = context.eventId;
        const packageId = context.packageId;
        const quantity = context.quantity ?? this.extractQuantity(message) ?? 1;
        if (!eventId || !packageId) {
          return this.error(locale, 'assistant.error.missing_package');
        }
        const quote = await this.bookingsService.quote(userId, {
          eventId,
          items: [{ packageId, quantity }],
        });
        return {
          state: AssistantState.AwaitingConfirmation,
          templateKey: 'assistant.quote.ready',
          locale,
          data: {
            eventId,
            packageId,
            quantity,
            quote,
          },
        };
      }

      case AssistantState.AwaitingConfirmation: {
        if (!this.isConfirmation(message)) {
          return {
            state: AssistantState.AwaitingConfirmation,
            templateKey: 'assistant.confirm.required',
            locale,
            data: { context },
          };
        }
        const eventId = context.eventId;
        const packageId = context.packageId;
        const quantity = context.quantity ?? 1;
        if (!eventId || !packageId) {
          return this.error(locale, 'assistant.error.missing_context');
        }

        const result = await this.bookingsService.create(userId, {
          eventId,
          items: [{ packageId, quantity }],
        });

        return {
          state: AssistantState.Success,
          templateKey: 'assistant.booking.success',
          locale,
          data: {
            bookingId: result.booking._id.toString(),
            reference: result.booking.reference,
            tickets: result.tickets.map((ticket) => ({
              id: ticket._id.toString(),
              ticketCode: ticket.ticketCode,
              qrToken: ticket.qrToken,
            })),
          },
        };
      }

      default:
        return this.searchEvents(locale);
    }
  }

  private async searchEvents(locale: 'en' | 'hi'): Promise<AssistantTurnResponse> {
    const events = await this.eventsService.listPublic({});
    return {
      state: AssistantState.SelectingEvent,
      templateKey: 'assistant.events.list',
      locale,
      data: {
        events: events.map((event) => ({
          id: event._id.toString(),
          title: event.title,
          startAt: event.startAt,
          venue: event.venue,
          category: event.category,
        })),
      },
    };
  }

  private isConfirmation(message: string) {
    return ['yes', 'confirm', 'ok', 'haan', 'ha', 'book'].some((word) =>
      message.includes(word),
    );
  }

  private extractQuantity(message: string) {
    const match = message.match(/\d+/);
    if (!match) {
      return undefined;
    }
    const qty = Number.parseInt(match[0]!, 10);
    return Number.isFinite(qty) ? qty : undefined;
  }

  private extractEventId(message: string) {
    const match = message.match(/[a-f0-9]{24}/i);
    return match?.[0];
  }

  private error(locale: 'en' | 'hi', templateKey: string): AssistantTurnResponse {
    return {
      state: AssistantState.Error,
      templateKey,
      locale,
      data: {},
    };
  }
}

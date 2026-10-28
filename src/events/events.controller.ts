import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListEventsQueryDto } from './dto/list-events-query.dto.js';
import { EventsService } from './events.service.js';
import { toPublicEvent } from './events.mapper.js';
import type { EventDocument } from './schemas/event.schema.js';
import { TicketPackagesService } from './ticket-packages.service.js';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly packagesService: TicketPackagesService,
  ) {}

  @Get()
  async list(@Query() query: ListEventsQueryDto) {
    const events = await this.eventsService.listPublic(query);
    return {
      events: events.map((event) => toPublicEvent(event as EventDocument)),
    };
  }

  @Get(':id/ticket-packages')
  async listTicketPackages(@Param('id') id: string) {
    return this.packagesService.getPublicPackagesForEvent(id);
  }

  @Get(':id/availability')
  async getAvailability(@Param('id') id: string) {
    const availability =
      await this.packagesService.getAvailabilityForPublicEvent(id);
    return { availability };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const event = await this.eventsService.getPublicById(id);
    return { event: toPublicEvent(event) };
  }
}

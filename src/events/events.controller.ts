import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListEventsQueryDto } from './dto/list-events-query.dto.js';
import { EventsService } from './events.service.js';
import { toPublicEvent } from './events.mapper.js';
import type { EventDocument } from './schemas/event.schema.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list(@Query() query: ListEventsQueryDto) {
    const events = await this.eventsService.listPublic(query);
    return {
      events: events.map((event) => toPublicEvent(event as EventDocument)),
    };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const event = await this.eventsService.getPublicById(id);
    return { event: toPublicEvent(event) };
  }
}

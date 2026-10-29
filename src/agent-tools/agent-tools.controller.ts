import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AgentToolsService } from './agent-tools.service.js';
import {
  CreateBookingToolDto,
  EventIdToolDto,
  ListEventsToolDto,
  QuoteBookingToolDto,
  SessionTokenToolDto,
  SignInAttendeeToolDto,
} from './dto/agent-tools.dto.js';
import { AgentWebhookGuard } from './guards/agent-webhook.guard.js';

@ApiExcludeController()
@Controller('agent/tools')
@UseGuards(AgentWebhookGuard)
export class AgentToolsController {
  constructor(private readonly agentTools: AgentToolsService) {}

  @Post('list-events')
  @HttpCode(200)
  listEvents(@Body() dto: ListEventsToolDto) {
    return this.agentTools.listEvents(dto);
  }

  @Post('list-event-packages')
  @HttpCode(200)
  listEventPackages(@Body() dto: EventIdToolDto) {
    return this.agentTools.listEventPackages(dto);
  }

  @Post('sign-in-attendee')
  @HttpCode(200)
  signInAttendee(@Body() dto: SignInAttendeeToolDto) {
    return this.agentTools.signInAttendee(dto);
  }

  @Post('quote-booking')
  @HttpCode(200)
  quoteBooking(@Body() dto: QuoteBookingToolDto) {
    return this.agentTools.quoteBooking(dto);
  }

  @Post('create-booking')
  @HttpCode(200)
  createBooking(@Body() dto: CreateBookingToolDto) {
    return this.agentTools.createBooking(dto);
  }

  @Post('list-my-bookings')
  @HttpCode(200)
  listMyBookings(@Body() dto: SessionTokenToolDto) {
    return this.agentTools.listMyBookings(dto.agentSessionToken);
  }
}

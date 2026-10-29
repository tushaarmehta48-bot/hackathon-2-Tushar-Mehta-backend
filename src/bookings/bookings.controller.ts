import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { BookingsService } from './bookings.service.js';
import { toBookingSummary, toTicketPublic } from './bookings.mapper.js';
import { BookingRequestDto } from './dto/booking-items.dto.js';

@Controller('bookings')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Attendee)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('quote')
  @HttpCode(200)
  async quote(@Body() dto: BookingRequestDto, @CurrentUser() user: SafeUser) {
    const quote = await this.bookingsService.quote(user.id, dto);
    return {
      quote: {
        ...quote,
        items: quote.items.map((item) => ({
          ...item,
          packageId: item.packageId.toString(),
        })),
      },
    };
  }

  @Post()
  async create(@Body() dto: BookingRequestDto, @CurrentUser() user: SafeUser) {
    const { booking, tickets } = await this.bookingsService.create(
      user.id,
      dto,
    );
    return {
      booking: toBookingSummary(booking),
      tickets: tickets.map(toTicketPublic),
    };
  }

  @Get('me')
  async listMine(@CurrentUser() user: SafeUser) {
    const bookings = await this.bookingsService.listMine(user.id);
    return { bookings: bookings.map(toBookingSummary) };
  }

  @Get(':id/tickets')
  async listTickets(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ) {
    const tickets = await this.bookingsService.listTicketsForBooking(
      id,
      user.id,
      user.role,
    );
    return { tickets: tickets.map(toTicketPublic) };
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const booking = await this.bookingsService.getByIdForUser(
      id,
      user.id,
      user.role,
    );
    return { booking: toBookingSummary(booking) };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const booking = await this.bookingsService.cancel(id, user.id);
    return { booking: toBookingSummary(booking) };
  }
}

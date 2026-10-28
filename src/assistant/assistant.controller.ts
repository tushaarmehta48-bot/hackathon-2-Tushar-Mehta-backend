import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { AssistantService } from './assistant.service.js';
import { AssistantTurnDto } from './dto/assistant-turn.dto.js';

@ApiTags('assistant')
@ApiCookieAuth('eventpulse.sid')
@Controller('assistant')
@UseGuards(SessionAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('turn')
  async turn(@Body() dto: AssistantTurnDto, @CurrentUser() user: SafeUser) {
    const result = await this.assistantService.turn(user.id, dto);
    return { turn: result };
  }
}

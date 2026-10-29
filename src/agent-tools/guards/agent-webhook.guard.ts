import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AgentWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const expected = this.config.get<string>('agentWebhook.secret');
    if (!expected) {
      throw new UnauthorizedException('Agent webhook is not configured');
    }

    const header =
      req.header('x-eventpulse-agent-secret') ??
      req.header('X-EventPulse-Agent-Secret');
    const auth = req.header('authorization');
    const bearer =
      auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : undefined;

    const provided = header ?? bearer;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid agent webhook secret');
    }
    return true;
  }
}

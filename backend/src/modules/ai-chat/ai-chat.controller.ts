import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';

@ApiBearerAuth()
@ApiTags('ai-chat')
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('session')
  session(@CurrentUser('id') userId: string) {
    return this.aiChatService.session(userId);
  }

  @Get('sessions/:id/messages')
  messages(@Param('id') id: string) {
    return this.aiChatService.messages(id);
  }

  @Post('sessions/:id/messages')
  send(@Param('id') id: string, @Body('content') content: string) {
    return this.aiChatService.send(id, content);
  }
}

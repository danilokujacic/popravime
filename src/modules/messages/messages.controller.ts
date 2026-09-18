import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { DOCUMENT_UPLOAD_OPTIONS } from '../../common/upload/upload-limits.constants';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageResponseMapper } from './mappers/message-response.mapper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { MESSAGE_THROTTLE } from '../infra/rate-limit/rate-limit.constants';
import { PrivateFileUrlInterceptor } from '../infra/storage/private-file-url.interceptor';

@Controller('messages')
@UseInterceptors(PrivateFileUrlInterceptor)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async List(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.ListForConversation(
      { requestId: query.requestId, inquiryId: query.inquiryId },
      user.id,
    );
    return messages.map(MessageResponseMapper.ToDto);
  }

  @UseInterceptors(FileInterceptor('attachment', DOCUMENT_UPLOAD_OPTIONS))
  @Throttle(MESSAGE_THROTTLE)
  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
    @UploadedFile() attachment: Express.Multer.File | undefined,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.Create(user.id, {
      requestId: dto.requestId,
      inquiryId: dto.inquiryId,
      body: dto.body,
      attachment: attachment
        ? {
            buffer: attachment.buffer,
            fileName: attachment.originalname,
            contentType: attachment.mimetype,
          }
        : undefined,
    });
    return MessageResponseMapper.ToDto(message);
  }

  @Patch(':id/read')
  async MarkRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.MarkRead(id, user.id);
    return MessageResponseMapper.ToDto(message);
  }
}

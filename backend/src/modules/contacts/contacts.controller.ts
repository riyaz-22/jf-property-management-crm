import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  ContactQueryDto,
  CreateContactDto,
  ScheduleValuationDto,
  UpdateAppointmentDto,
  UpdateChecklistItemDto,
  UpdateContactDto,
} from './dto/contact.dto';
import { ContactsService } from './contacts.service';

const avatarUploadDir = join(process.cwd(), 'uploads', 'contact-avatars');
const allowedAvatarMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const avatarStorage = diskStorage({
  destination: (_request, _file, callback) => {
    if (!existsSync(avatarUploadDir)) {
      mkdirSync(avatarUploadDir, { recursive: true });
    }
    callback(null, avatarUploadDir);
  },
  filename: (_request, file, callback) => {
    callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

const avatarInterceptor = FileInterceptor('avatar', {
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedAvatarMimeTypes.includes(file.mimetype)) {
      callback(new BadRequestException('Profile image must be a JPG, PNG, or WEBP file'), false);
      return;
    }
    callback(null, true);
  },
});

@ApiBearerAuth()
@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@Query() query: ContactQueryDto) {
    return this.contactsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Get(':id/sell-intent')
  getSellIntent(@Param('id') id: string) {
    return this.contactsService.getSellIntent(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }

  @Post(':id/avatar')
  @UseInterceptors(avatarInterceptor)
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Profile image file is required');
    }
    return this.contactsService.updateAvatar(id, `/uploads/contact-avatars/${file.filename}`);
  }

  @Delete(':id/avatar')
  removeAvatar(@Param('id') id: string) {
    return this.contactsService.removeAvatar(id);
  }

  @Patch(':id/sell-intent/checklist')
  updateChecklist(@Param('id') id: string, @Body() dto: UpdateChecklistItemDto) {
    return this.contactsService.updateChecklist(id, dto);
  }

  @Post(':id/appointments')
  scheduleValuation(@Param('id') id: string, @Body() dto: ScheduleValuationDto) {
    return this.contactsService.scheduleValuation(id, dto);
  }

  @Patch('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.contactsService.updateAppointment(id, dto);
  }
}

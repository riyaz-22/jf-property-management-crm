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
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

const avatarUploadDir = join(process.cwd(), 'uploads', 'avatars');
const allowedAvatarMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const avatarStorage = diskStorage({
  destination: (_request, _file, callback) => {
    if (!existsSync(avatarUploadDir)) {
      mkdirSync(avatarUploadDir, { recursive: true });
    }
    callback(null, avatarUploadDir);
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!allowedAvatarMimeTypes.includes(file.mimetype)) {
        callback(new BadRequestException('Profile image must be a JPG, PNG, or WEBP file'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadMyAvatar(
    @CurrentUser('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Profile image file is required');
    }

    return this.usersService.updateAvatar(id, `/uploads/avatars/${file.filename}`);
  }

  @Delete('me/avatar')
  removeMyAvatar(@CurrentUser('id') id: string) {
    return this.usersService.removeAvatar(id);
  }

  @Post(':id/avatar')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!allowedAvatarMimeTypes.includes(file.mimetype)) {
        callback(new BadRequestException('Profile image must be a JPG, PNG, or WEBP file'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Profile image file is required');
    }

    return this.usersService.updateAvatar(id, `/uploads/avatars/${file.filename}`);
  }

  @Delete(':id/avatar')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  removeAvatar(@Param('id') id: string) {
    return this.usersService.removeAvatar(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

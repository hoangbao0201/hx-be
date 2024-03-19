import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, JwtService, CloudinaryService],
})
export class AdminModule {}

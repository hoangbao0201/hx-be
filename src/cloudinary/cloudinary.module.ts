import { Module } from '@nestjs/common';  
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';

@Module({
  controllers: [CloudinaryController],
  providers: [
    // CloudinaryProvider,
    CloudinaryService
  ],
  exports: [
    // CloudinaryProvider,
    CloudinaryService
  ]
})
export class CloudinaryModule {}

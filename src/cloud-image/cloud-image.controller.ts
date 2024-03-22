import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CloudImageService } from './cloud-image.service';
import { CreateCloudImageDto } from './dto/create-cloud-image.dto';
import { UpdateCloudImageDto } from './dto/update-cloud-image.dto';

@Controller('cloud-image')
export class CloudImageController {
  constructor(private readonly cloudImageService: CloudImageService) {}

  @Post()
  create(@Body() createCloudImageDto: CreateCloudImageDto) {
    return this.cloudImageService.create(createCloudImageDto);
  }

  @Get()
  findAll() {
    return this.cloudImageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cloudImageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCloudImageDto: UpdateCloudImageDto) {
    return this.cloudImageService.update(+id, updateCloudImageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cloudImageService.remove(+id);
  }
}

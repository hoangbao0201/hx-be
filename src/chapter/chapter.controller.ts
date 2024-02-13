import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Controller('/api/chapters')
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  @Get('/:chapterNumber/:bookId')
  findOne(
    @Param('chapterNumber') chapterNumber: number,
    @Param('bookId') bookId: number,
  ) {
    return this.chapterService.findOne(chapterNumber, bookId);
  }
}

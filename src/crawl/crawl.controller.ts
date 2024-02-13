import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { CrawlBookDTO } from './dto/crawl-novel.dto';

@Controller('/api/crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  @UseGuards(JwtGuard)
  @Post('/book')
  createBook(@Request() req, @Query('type') type: "lxhentai" | "hentaivn", @Body() crawlNovelDTO: CrawlBookDTO) {
    return this.crawlService.createNovel(req.user.userId, {
      type: type,
      take: crawlNovelDTO?.take ? crawlNovelDTO?.take : 1,
      bookUrl: crawlNovelDTO?.bookUrl,
    });
  }
}

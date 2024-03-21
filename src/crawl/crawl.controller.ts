import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { JwtGuard } from '../auth/guard/jwt.guard';

@Controller('/api/crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  // @UseGuards(JwtGuard)
  // @Post('/book')
  // createBook(
  //   @Request() req,
  //   @Body('type') type: "lxhentai" | "hentaivn",
  //   @Body('bookUrl') bookUrl: string,
  //   @Body('email') email: string,
  // ) {
  //   return this.crawlService.createBook(req.user.userId, {
  //     type: type,
  //     bookUrl: bookUrl,
  //     email: email,
  //   });
  // }

  // @UseGuards(JwtGuard)
  // @Post('/chapter')
  // createChapters(
  //   @Request() req,
  //   @Body('type') type: "lxhentai" | "hentaivn",
  //   @Body('take') take: number,
  //   @Body('email') email: string,
  //   @Body('bookUrl') bookUrl: string,
  // ) {
  //   return this.crawlService.createChapters(req.user.userId, {
  //     type: type,
  //     email: email,
  //     take: +take || 1,
  //     bookUrl: bookUrl,
  //   });
  // }

}

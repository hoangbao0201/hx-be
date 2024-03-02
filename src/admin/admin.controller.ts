import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import axios from 'axios';
import userAgent from 'random-useragent';


@Controller('/api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(JwtGuard)
  @Get('/books')
  findAllBooks(
    @Request() req,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('sort') sort?: 'desc' | 'asc',
  ) {
    return this.adminService.findAllBooks(req.user, { take: take, skip: skip, sort });
  }

  @UseGuards(JwtGuard)
  @Post('/books')
  updateBook(
    @Request() req,
    @Body() body: { bookId: number, title: string, isGreatBook: boolean }
  ) {
    return this.adminService.updateBook(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Delete('/books/:bookId')
  deleteBook(
    @Request() req,
    @Param("bookId") bookId: number
  ) {
    return this.adminService.deleteBook(req.user, bookId);
  }

  @UseGuards(JwtGuard)
  @Get('/books/views')
  getViews(
    @Request() req,
  ) {
    return this.adminService.getViews(req.user);
  }

  @Get('/test')
  async test() {
    // const response = await axios.get("https://www.vipads.live/vn/886F8AFE-FF83-1620-33-D7BCF23CEE7C.blpha", {
    //   headers: {
    //     referer: "hoangbaodev.com",
    //     'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    //     'Sec-Ch-Ua-Mobile': "?0",
    //     'Sec-Ch-Ua-Platform': "Windows",
    //     'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Mobile Safari/537.36'
    //   }
    // });
    return {
      success: true,
      // data: response
    }
  }
}

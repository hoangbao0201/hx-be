import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guard/jwt.guard';

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
}

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

  @UseGuards(JwtGuard)
  @Get('/users')
  getUsers(
    @Request() req,
  ) {
    return this.adminService.getUsers(req.user);
  }

  @Get('/test')
  async test() {
    return this.adminService.test();
  }
}

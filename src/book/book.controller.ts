import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { BookService } from './book.service';
import { PipGuard } from '../auth/guard/pip.guard';

@Controller('/api/books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('byu') byu?: string,
    @Query('genres') genres?: string,
    @Query('notgenres') notgenres?: string,
    @Query('take') take?: number,
    @Query('skip') skip?: number,
    @Query('otherId') otherId?: number,
    @Query('sort') sort?: 'desc' | 'asc',
  ) {
    return this.bookService.findAll({ q, byu, genres, notgenres, take: take, skip: skip, sort, otherId });
  }

  @Get('/seo')
  findAllSeo() {
    return this.bookService.findAllSeo();
  }

  // Increase View Book
  @UseGuards(PipGuard)
  @Post("/increase/views/:bookId")
  increaseViews(
    @Request() req,
    @Param("bookId") bookId: number
  ){
    return this.bookService.increaseViews({ user: req.user, bookId });
  }

  @Get("/:bookId")
  findOne(
    @Param("bookId") bookId: number
  ){
    return this.bookService.findOne(bookId);
  }

}

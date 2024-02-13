import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('/api/books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  findAll(
    @Query('q') q: string,
    @Query('byu') byu: string,
    @Query('tags') tags: string,
    @Query('take') take: number,
    @Query('skip') skip: number,
    @Query('otherId') otherId: number,
    @Query('sort') sort: 'desc' | 'asc',
  ) {
    return this.bookService.findAll({ q, byu, tags, take: take, skip: skip, sort, otherId });
  }
}

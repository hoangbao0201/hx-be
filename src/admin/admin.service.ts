import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prismaService: PrismaService) {}

  async findAllBooks(
    user: { userId: number; username: string; role: { name: string } },
    options: { take?: number; skip?: number; sort?: 'desc' | 'asc' },
  ) {
    if (user?.role.name === 'guest') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    const {
      take = 24,
      skip = 0,
      sort = 'desc',
    } = options;

    try {
      const books = await this.prismaService.book.findMany({
        take: +take,
        skip: +skip,
        orderBy: {
          updatedAt: sort,
        },
        select: {
          bookId: true,
          title: true,
          thumbnail: true,
          scrapedUrl: true,
          isGreatBook: true,
          _count: {
            select: {
              chapters: true,
            },
          },
        },
      });

      const countBook = await this.prismaService.book.count({});

      return {
        success: true,
        countBook: countBook,
        books: books,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async updateBook(
    user: { userId: number; username: string; role: { name: string } },
    book: { bookId: number, title: string, isGreatBook: boolean }
  ) {
    if (user?.role.name === 'guest') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    try {
      const { bookId, title, isGreatBook } = book;
      const bookRes = await this.prismaService.$executeRaw`UPDATE Book SET isGreatBook = ${isGreatBook} WHERE bookId = ${bookId};`;

      return {
        success: true,
        book: bookRes,
        bookData: { bookId, title, isGreatBook },
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }
}

import { Get, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookService {
  constructor(private prismaService: PrismaService) {}


  async findAll(options: {
    q?: string;
    byu?: string;
    tags?: string;
    take?: number;
    skip?: number;
    sort?: 'desc' | 'asc';
    otherId?: number
  }) {
    const {
      q = '',
      byu = '',
      tags = '',
      take = 24,
      skip = 0,
      sort = 'desc',
      otherId
  } = options;

    try {
      const books = await this.prismaService.book.findMany({
        skip: +skip,
        take: +take,
        select: {
          bookId: true,
          title: true,
          slug: true,
          thumbnail: true,
          chapters: {
            take: 3, // Lấy ra 3 chương gần đây nhất cho mỗi cuốn sách
            orderBy: { createdAt: 'desc' },
            select: {
              chapterNumber: true,
              createdAt: true
            }
          },
        },
      })

      return {
        success: true,
        books: books
      }
    } catch (error) {
      return {
        success: false,
        error: error
      }
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} book`;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}

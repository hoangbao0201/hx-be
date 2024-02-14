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
            take: 2,
            orderBy: {
              chapterNumber: "desc"
            },
            select: {
              chapterNumber: true,
              createdAt: true
            }
          },
        },
      });

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

  async findOne(bookId: number) {
    try {
      const bookRes = await this.prismaService.book.findUnique({
        where: {
          bookId: +bookId
        },
        select: {
          bookId: true,
          title: true,
          slug: true,
          anotherName: true,
          description: true,
          status: true,
          thumbnail: true,
          tags: true,
          author: {
            select: {
              name: true,
              authorId: true
            },
          },
          postedBy: {
            select: {
              avatarUrl: true,
              role: true,
              name: true,
              username: true,
            }
          },
          chapters: {
            orderBy: {
              chapterNumber: 'desc'
            },
            select: {
              title: true,
              chapterNumber: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chapters: true
            }
          }
        }
      }) 

      return {
        success: true,
        book: bookRes
      }
    } catch (error) {
      return {
        success: false,
        error: error
      }
    }
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}

import { Get, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookService {
  constructor(private prismaService: PrismaService) {}

  async findAll(options: {
    q?: string;
    byu?: string;
    genres?: string;
    notgenres?: string;
    take?: number;
    skip?: number;
    sort?: 'desc' | 'asc';
    otherId?: number;
  }) {
    const {
      q = '',
      byu = '',
      genres,
      notgenres,
      take = 24,
      skip = 0,
      sort = 'desc',
      otherId,
    } = options;

    try {
      const haveTags = genres ? genres?.split(",") : null;
      const notTags = notgenres ? notgenres?.split(",") : null;

      let where: Prisma.BookWhereInput = {}
      if (haveTags) {
        where = {
          ...where,
          AND: haveTags.map((tagT) => ({
            tags: {
              some: {
                tagId: {
                  equals: tagT
                }
              }
            }
          }))
        }
      }
      if (notTags) {
        where = {
          ...where,
          tags: {
            none: {
              tagId: {
                in: notTags
              }
            }
          }
        }
      }
      if (q) {
        where = {
          ...where,
          title: {
            contains: q
          }
        }
      }
      const books = await this.prismaService.book.findMany({
        skip: +skip,
        take: +take,
        orderBy: {
          updatedAt: sort
        },
        where: where,
        select: {
          bookId: true,
          title: true,
          slug: true,
          thumbnail: true,
          scrapedUrl: true,
          isGreatBook: true,
          chapters: {
            take: 2,
            orderBy: {
              chapterNumber: 'desc',
            },
            select: {
              chapterNumber: true,
              createdAt: true,
            },
          },
        },
      });

      const countBook = await this.prismaService.book.count({
        where: where,
      });

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

  async findOne(bookId: number) {
    try {
      const bookRes = await this.prismaService.book.findUnique({
        where: {
          bookId: +bookId,
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
              authorId: true,
            },
          },
          postedBy: {
            select: {
              avatarUrl: true,
              role: true,
              name: true,
              username: true,
            },
          },
          chapters: {
            orderBy: {
              chapterNumber: 'desc',
            },
            select: {
              title: true,
              chapterNumber: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chapters: true,
            },
          },
        },
      });

      return {
        success: true,
        book: bookRes,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}

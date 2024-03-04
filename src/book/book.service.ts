import { Get, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class BookService {
  constructor(
    private prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

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

    const cvQuery = `/api/books?genres=${genres}&notgenres=${notgenres || ""}&q=${q || ""}&take=${take || ""}&skip=${skip || ""}&sort=${sort || ""}`;
    const cacheValue: any = await this.cacheManager.get(cvQuery);
    if(cacheValue) {
      return {
        success: true,
        cache: true,
        countBook: cacheValue?.countBook,
        books: cacheValue?.books
      };
    }

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
          nameImage: true,
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

      await this.cacheManager.set(cvQuery, { countBook: countBook, books: books }, 60000);

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
          nameImage: true,
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
              _count: {
                select: {
                  views: true
                }
              },
              createdAt: true,
              updatedAt: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chapters: true,
              userViews: true
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

  async findAllSeo() {
    try {
      const books = await this.prismaService.book.findMany({
        select: {
          slug: true,
          bookId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        books: books,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async increaseViews({ user, bookId, chapterNumber }: { user?: null | { userId: number }, bookId: number, chapterNumber: number }) {
    try {
      const book = await this.prismaService.userView.create({
        data: {
          bookId: +bookId,
          chapterNumber: +chapterNumber,
          userId: user ? user?.userId : null,
        }
      })
      return {
        success: true,
        book: book,
      }
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }
}

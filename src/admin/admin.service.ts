import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import draftToHtml from 'draftjs-to-html';

@Injectable()
export class AdminService {
  constructor(private prismaService: PrismaService) {}

  async findAllBooks(
    user: { userId: number; username: string; role: { name: string } },
    options: { take?: number; skip?: number; sort?: 'desc' | 'asc' },
  ) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    const { take = 24, skip = 0, sort = 'desc' } = options;

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
          nameImage: true,
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
    book: { bookId: number; title: string; isGreatBook: boolean },
  ) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    try {
      const { bookId, title, isGreatBook } = book;
      const bookRes = await this.prismaService
        .$executeRaw`UPDATE Book SET isGreatBook = ${isGreatBook} WHERE bookId = ${bookId};`;

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

  async deleteBook(
    user: { userId: number; username: string; role: { name: string } },
    bookId: number,
  ) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }
    try {
      const deleteBook = await this.prismaService.book.delete({
        where: {
          bookId: +bookId,
          postedBy: {
            userId: user.userId,
          },
        },
      });
      return {
        success: true,
        book: deleteBook,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async getViews(user: {
    userId: number;
    username: string;
    role: { name: string };
  }) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }
    try {
      const countView = await this.prismaService.userView.count({});

      // const lastDate = Date.now() - 24 * 60 * 60 * 1000;
      // const views = await this.prismaService.userView.findMany({
      //   where: {
      //     createdAt: {
      //       gte: new Date(lastDate),
      //     },
      //   },
      //   select: {

      //   }
      // })
      // const views = await this.prismaService.$executeRaw`SELECT * FROM 'UserView'`;
      // -- FROM UserView
      // -- WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      // -- GROUP BY HOUR(createdAt)
      // -- ORDER BY hour;

      return {
        success: true,
        countView: countView,
        // views: 1,
        // test: views,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async getUsers(user: {
    userId: number;
    username: string;
    role: { name: string };
  }) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }
    try {
      const users = await this.prismaService.user.findMany({
        take: 5,
        skip: 0,
        where: {
          NOT: {
            userId: user?.userId,
          },
        },
        orderBy: {
          rank: "desc"
        },
        select: {
          userId: true,
          name: true,
          username: true,
          email: true,
          rank: true
          // password: true,
        },
      });

      const countUser = await this.prismaService.user.count({});
      return {
        success: true,
        countUser: countUser,
        users: users,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async test() {
    try {
      // const users = await this.prismaService.user.findMany({
      //   select: {
      //     userId: true,
      //     rank: true
      //   }
      // });

      // for (const user of users) {
        // Cập nhật trường rank trong model User
        await this.prismaService.user.update({
          where: {
            userId: 1,
          },
          data: {
            rank: {
              increment: 500
            },
          },
        });
      // }

      // const updatedComments = [];
      // for (const comment of comments) {
      //   const updateComment = await this.prismaService.comment.update({
      //       where: {
      //         commentId: comment.commentId,
      //       },
      //       data: {
      //         commentText: comment?.commentText
      //       },
      //       select: {
      //         commentId: true,
      //         commentText: true
      //       }
      //   });
      //   updatedComments.push(updateComment);
      // }

      return {
        success: true,
        // users: users,
        // comments: comments[0].commentText.replace('\"<p>p>', '\"<p>').replace('\\\"', ''),
        // test: comments,
        // updatedComments: updatedComments,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }
}

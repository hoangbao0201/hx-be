import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(private prismaService: PrismaService) {}

  async createComment(userId: number, createCommentDto: CreateCommentDto) {
    const { bookId, chapterNumber, parentId, receiverId, commentText } =
      createCommentDto;
    try {
      const comment = await this.prismaService.comment.create({
        data: {
          senderId: +userId,
          bookId: +bookId,
          chapterNumber: chapterNumber ? +chapterNumber : null,
          parentId: parentId ? +parentId : null,
          receiverId: receiverId ? +receiverId : null,
          commentText: commentText,
        },
        select: {
          bookId: true,
          chapterNumber: true,
          commentId: true,
          commentText: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              replyComments: true,
            },
          },
          sender: {
            select: {
              userId: true,
              name: true,
              username: true,
              rank: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      });
      return {
        success: true,
        comment: comment,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async getComments(options: {
    bookId?: number,
    chapterNumber?: number,
    parentId?: number,
    take?: number,
    skip?: number,
    // sort?: 'desc' | 'asc';
  }) {
    const { parentId, bookId, chapterNumber, take = 10, skip = 0 } = options;

    let where: Prisma.CommentWhereInput = {};
    let select: Prisma.CommentSelect = {};

    if(parentId) {
      where = {
        ...where,
        parentId: +parentId,
      }
    }
    if(bookId) {
      where = {
        ...where,
        bookId: +bookId,
      }
    }
    if(chapterNumber) {
      where = {
        ...where,
        chapterNumber: +chapterNumber,
      }
    }
    // if(!parentId && !bookId && !chapterNumber) {
    //   select = {
    //   }
    // }
    
    try {
      const comments = await this.prismaService.comment.findMany({
        skip: +skip,
        take: +take,
        orderBy: {
          createdAt: parentId ? 'asc' : 'desc',
        },
        where: where,
        select: {
          bookId: true,
          chapterNumber: true,
          commentId: true,
          commentText: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          ...select,
          _count: {
            select: {
              replyComments: true,
            },
          },
          sender: {
            select: {
              userId: true,
              name: true,
              username: true,
              rank: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        success: true,
        comments: comments
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async deleteComment({
    userId,
    commentId,
  }: {
    userId: number;
    commentId: number;
  }) {
    try {
      const comment = await this.prismaService.comment.delete({
        where: {
          sender: {
            userId: +userId,
          },
          commentId: +commentId,
        },
      });
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  // findAll() {
  //   return `This action returns all comment`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} comment`;
  // }

  // update(id: number, updateCommentDto: UpdateCommentDto) {
  //   return `This action updates a #${id} comment`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} comment`;
  // }
}

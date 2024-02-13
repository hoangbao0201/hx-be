import { Injectable } from '@nestjs/common';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChapterService {
  constructor(private prismaService: PrismaService) {}

  async findOne(chapterNumber: number, bookId: number) {
    try {
      const chapter = await this.prismaService.chapter.findUnique({
        where: {
          chapterNumber_bookId: {
            bookId: +bookId,
            chapterNumber: +chapterNumber,
          },
        },
        select: {
          bookId: true,
          chapterNumber: true,
          content: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          book: {
            select: {
              title: true,
              slug: true,
              anotherName: true,
              author: {
                select: {
                  name: true,
                  authorId: true
                }
              },
              postedBy: {
                select: {
                  name: true,
                  username: true
                }
              }
            }
          },
        },
      });
      if (!chapter?.bookId) {
        throw new Error('Error get chapter');
      }

      return {
        success: true,
        chapter: chapter,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }
}

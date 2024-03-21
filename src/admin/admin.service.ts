import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import axios from 'axios';
import * as cheerio from 'cheerio';
import userAgent from 'random-useragent';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { listTagToId } from '../constants/data';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private s3_client: S3Client;
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    this.s3_client = new S3Client({
      region: this.configService.get("S3Region"),
      credentials: {
        accessKeyId: this.configService.get("Accesskey"),
        secretAccessKey: this.configService.get("SecretAccessKey"),
      },
    });
  }

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
          rank: 'desc',
        },
        select: {
          userId: true,
          name: true,
          username: true,
          email: true,
          rank: true,
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

  async test(bookId: number) {
    try {
      return {
        success: true
      }
      const books = await this.prismaService.book.findMany({
        where: {
          type: "hentaivn",
          check: false
        },
        select: {
          bookId: true,
          scrapedUrl: true,
          next: true,
          _count: {
            select: {
              chapters: true
            }
          }
        }
      });

      // for(const book of books) {
      //   const cvSc = book?.next.replace("https://hentaivn.one/", "").replace("https://hentaivn.blue/", "");
      //   if(cvSc !== book?.next) {
      //     await this.prismaService.book.update({
      //       where: {
      //         bookId: book?.bookId
      //       },
      //       data: {
      //         next: cvSc
      //       }
      //     })
      //   }
      // }
      for(const book of books) {
        // const book = await this.prismaService.book.findUnique({
        //   where: {
        //     bookId: +bookId,
        //     type: "hentaivn"
        //   },
        //   select: {
        //     bookId: true,
        //     scrapedUrl: true,
        //     next: true,
        //     _count: {
        //       select: {
        //         chapters: true
        //       }
        //     }
        //   }
        // });
        // if(!book) {
        //   return {
        //     success: false,
        //     message: "Không phải hentaivn"
        //   }
        // }
  
        const dataBook = await this.crawlBook(
          'hentaivn',
          'https://hentaivn.blue/' + book?.scrapedUrl,
        );
        if (!dataBook?.success) {
          throw new Error('Error crawling book');
        }
  
        const imageUpload = await this.uploadImageBookOnS3({ type: "hentaivn", bookId: book?.bookId, url: dataBook?.book.thumbnail });
        if(!imageUpload) {
          return {
            success: false,
            message: "Upload thumbnail book error"
          }
        }
  
        await this.prismaService.book.update({
          where: {
            bookId: book?.bookId
          },
          data: {
            thumbnail: imageUpload?.imageKey,
            check: true
          }
        });
  
        if (!book?.next) {
          return {
            success: true,
            message: 'Chưa có chương nào',
          };
        }
        const chaptersUpdate = await this.createMultipleChaptersBook({
          take: book?._count.chapters,
          bookId: book?.bookId,
          chapterUrl: book?.next,
          type: 'hentaivn',
        });
        if(!chaptersUpdate?.success) {
          return {
            success: false,
            error: chaptersUpdate?.error
          }
        }

        console.log("Get Book " + book?.bookId + " Successfully =================");
        await this.wait(3000);
      }

      // const u = await this.prismaService.book.update({
      //   where: {
      //     bookId: +bookId
      //   },
      //   data: {
      //     check: true
      //   }
      // })

      return {
        success: true,
        // dataBook: dataBook,
        // chapters: chapters,
        // book
        // image: "https://d32phrebrjmlad.cloudfront.net/" + imageUpload?.imageKey
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  // Create Multiple Chapters Book
  async createMultipleChaptersBook({
    type,
    take,
    bookId,
    chapterUrl,
  }: {
    take: number,
    type: 'lxhentai' | 'hentaivn';
    bookId: number;
    chapterUrl: string;
  }) {
    let i = 1;
    let urlQuery = chapterUrl;

    try {
      while (!!urlQuery && i <= take) {
        const dataChapter = await this.crawlChapter(
          type,
          'https://hentaivn.blue/' + urlQuery,
        );
        if (
          !dataChapter?.success ||
          dataChapter?.chapter?.content.length === 0
        ) {
          throw new Error(`Error crawling chapter ${i}: ${dataChapter?.error}`);
        }

        let cvNextUrl = null;
        if (dataChapter?.next) {
          cvNextUrl = dataChapter?.next
            .replace('https://hentaivn.one/', '')
            .replace('https://hentaivn.blue/', '');
        }

        // return {
        //   success: true,
        //   chapterUrl,
        //   dataChapter,
        //   cvNextUrl
        // };

        console.log(dataChapter?.chapter.content);

        const imagesChapter = await this.uploadImagesChapters({
          baseUrl: 'https://hentaivn.blue',
          folder: `books/${bookId}/chapters/${i}`,
          listUrl: dataChapter?.chapter.content,
        });

        console.log(imagesChapter);

        if (!imagesChapter?.success || imagesChapter?.images.length === 0) {
          const listObjectsParams = {
            Bucket: 'hxclub-bucket',
            Prefix: `books/${bookId}/chapters/${i}`,
          };
          const data = await this.s3_client.send(
            new ListObjectsV2Command(listObjectsParams),
          );

          // Lấy danh sách các khóa của các đối tượng trong thư mục
          const objectsToDelete = data.Contents.map((object) => ({
            Key: object.Key,
          }));

          // Nếu có đối tượng để xóa, thực hiện xóa
          if (objectsToDelete.length > 0) {
            const deleteParams = {
              Bucket: 'hxclub-bucket',
              Delete: {
                Objects: objectsToDelete,
              },
            };
            await this.s3_client.send(new DeleteObjectsCommand(deleteParams));
          }
          throw new Error(
            `Failed to create images for chapter ${i}: ${imagesChapter?.error}`,
          );
        }

        // Update Chapter Book
        const chapterRes = await this.prismaService.chapter.update({
          where: {
            chapterNumber_bookId: {
              bookId: bookId,
              chapterNumber: i,
            },
          },
          data: {
            next: cvNextUrl,
            content: JSON.stringify(imagesChapter?.images),
          },
        });
        if (!chapterRes) {
          throw new Error(`Error creating chapters`);
        }

        console.log('Upload chapter ' + i + ' successfully');

        // If the next chapter doesn't exist
        if (!dataChapter?.next) {
          break;
        }

        urlQuery = cvNextUrl;
        i++;

        await this.wait(2000);
      }

      console.log('End ===========================');
      return {
        success: true,
        message: 'Create chapters successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async uploadImagesChapters(data: {
    baseUrl: string;
    folder: string;
    listUrl: string[];
    width?: number;
    height?: number;
  }) {
    const { baseUrl = '', folder = '', listUrl = [] } = data;
    let results = [];
    let k = 0;
    try {
      for (let i = 0; i < listUrl.length; i += 5) {
        const chunkUrls = listUrl.slice(i, i + 5);
        const uploadPromises = await chunkUrls.map(async (url) => {
          const imageGet = await axios.get(`${url}`, {
            responseType: 'arraybuffer',
            headers: {
              referer: baseUrl,
              'Sec-Ch-Ua':
                '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': 'Windows',
              'User-Agent': userAgent?.getRandom(),
            },
          });

          const key = folder + '/' + k + '.jpg';

          console.log('Upload image ' + k);

          k++;
          return new Promise<string>(async (resolve, reject) => {
            try {
              const result = await this.s3_client.send(
                new PutObjectCommand({
                  Bucket: 'hxclub-bucket',
                  Key: key,
                  ContentType: imageGet?.headers['content-type'],
                  Body: Buffer.from(imageGet?.data),
                }),
              );
              // Nếu không có lỗi, gọi resolve với key của đối tượng được tải lên
              resolve(key);
            } catch (error) {
              // Nếu có lỗi, gọi reject với lỗi đó
              reject(error);
            }
          });
        });

        const chunkResults = await Promise.all(uploadPromises);
        results.push(...chunkResults);

        await this.wait(1000);
      }
      return {
        success: true,
        images: results,
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async uploadImageBookOnS3({
    type,
    bookId,
    chapterNumber,
    url,
  }: {
    type: 'hentaivn' | 'lxhentai';
    bookId: number;
    chapterNumber?: number;
    url: string;
  }) {
    try {
      const imageGet = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      const key = `books/${bookId}/${Date.now().toString()}.jpg`;
      await this.s3_client.send(
        new PutObjectCommand({
          Bucket: 'hxclub-bucket',
          Key: key,
          ContentType: imageGet?.headers['content-type'],
          Body: Buffer.from(imageGet?.data),
        }),
      );
      return {
        success: true,
        imageKey: key,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Crawl Book
  async crawlBook(type: 'lxhentai' | 'hentaivn', url: string) {
    try {
      const baseUrl = new URL(url).origin;
      const response = await axios.get(url, {
        headers: {
          referer: baseUrl,
          'Sec-Ch-Ua':
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': 'Windows',
          'User-Agent': userAgent?.getRandom(),
        },
      });
      const $ = cheerio.load(response.data);
      let title = '';
      let thumbnail = null;
      let description = '';
      let anotherName = '';
      let status = 1;
      let author = '';
      let tags = [];
      let next = null;

      if (type === 'lxhentai') {
        title = $('title').text().split('- LXHENTAI')[0].trim();
        const urlMatch = /url\('([^']+)'\)/.exec(
          $('.rounded-lg.cover').attr('style'),
        );
        thumbnail = urlMatch ? urlMatch[1] : null;
        author = $('.mt-2 .text-blue-500').first().text();
        $(
          '.bg-gray-500.hover\\:bg-gray-600.text-white.rounded.px-2.text-sm.inline-block',
        ).each((index, element) => {
          const tag = $(element).text().trim();
          if (listTagToId[tag]) {
            tags.push(listTagToId[tag]);
          }
        });
        next = $('.overflow-y-auto.overflow-x-hidden>a').last().attr('href');
      } else if (type === 'hentaivn') {
        title = $(`.page-ava img`).attr('alt').split('Truyện hentai')[1].trim();
        const text = $('title')
          .text()
          .match(/\[(.*?)\]/);
        anotherName = text ? text[1] : '';
        thumbnail = $(`.page-ava img`).attr('src');
        status = 1;
        author = $('span.info').eq(3).next().text();
        description = '';
        $('a.tag').each((index, element) => {
          const tag = $(element).text().trim();
          if (listTagToId[tag]) {
            tags.push(listTagToId[tag]);
          }
        });
        next = $('.watch-online a').attr('href');
      }

      return {
        success: true,
        book: {
          title: title,
          thumbnail: thumbnail,
          description: description,
          anotherName: anotherName,
          status: status,
          author: author,
          tags: tags,
          next: next.length > 0 ? new URL(url).origin + next : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error,
      };
    }
  }

  // Crawl Chapter
  async crawlChapter(type: 'lxhentai' | 'hentaivn', url: string) {
    try {
      // const baseUrl = new URL(url).origin;
      const response = await axios.get(url, {
        headers: {
          referer: 'https://hentaivn.blue',
          'Sec-Ch-Ua':
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': 'Windows',
          'User-Agent': userAgent?.getRandom(),
        },
      });
      const $ = cheerio.load(response.data);

      let title = '';
      let content = [];
      let next = null;

      if (type === 'lxhentai') {
        title = '';
        content = $('.lazy.max-w-full.my-0.mx-auto')
          .map((index, element) => $(element).attr('src'))
          .get();
        let nextChapter = $('a#btn-next').attr('href');
        next =
          nextChapter === 'javascript:nm5213(0)'
            ? null
            : new URL(url).origin + nextChapter;
      } else if (type === 'hentaivn') {
        title = '';
        content = $('#image img')
          .map((index, element) => $(element).attr('data-src'))
          .get();
        const nextChapter = $('#nextLink.b-next').attr('href');
        next = nextChapter ? new URL(url).origin + '/' + nextChapter : null;
      }

      return {
        success: true,
        next: next,
        chapter: {
          title: title,
          content: content,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }
}

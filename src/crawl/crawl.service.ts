import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlBookDTO } from './dto/crawl-novel.dto';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { textToSlug } from '../utils/textToSlug';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Prisma } from '@prisma/client';

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/16.16299',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.3',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.3 Edge/17.17134',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.3 Edge/17.17134',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.3',
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
];

@Injectable()
export class CrawlService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Create Novel
  async createNovel(userId: number, { type = "lxhentai", take, bookUrl }: CrawlBookDTO & { type: "lxhentai" | "hentaivn" }) {
    try {
      const [checkBook, dataBook] = await Promise.all([
        // Check Existence Novel.
        this.prismaService.book.findUnique({
          where: {
            scrapedUrl: bookUrl,
          },
          select: {
            bookId: true,
          },
        }),
        // Crawl Data Novel
        this.crawlBook(type, bookUrl),
      ]);

      if(checkBook && checkBook?.bookId) {
        // Get Count Chapter
        const countChapterBook = await this.prismaService.chapter.count({
          where: {
            bookId: checkBook?.bookId
          },
        });

        // Create Multiple Chapter
        const chapterRes =  await this.createMultipleChaptersBook({
          bookId: checkBook?.bookId,
          bookUrl: bookUrl,
          start: countChapterBook,
          take: +take,
        });

        return {
          success: true,
          message: 'Book exist',
          chapterRes: chapterRes,
          // countChapterBook,
          // take,
          // bookUrl,
          // bookId: checkBook?.bookId
          // dataChapter: dataChapter,
          // dataBook: dataBook,
          // imagesChapter: imagesChapter
        };
      }

      if(!dataBook?.success) {
        throw new Error("Error crawling book");
      }
      const { title, anotherName, author, description, status, tags, thumbnail } = dataBook?.book;
      // Create Book
      const bookRes = await this.prismaService.book.create({
        data: {
          title: title,
          slug: textToSlug(title),
          anotherName: anotherName,
          description: description,
          status: status,
          scrapedUrl: bookUrl,
          postedBy: {
            connect: {
              userId: userId
            }
          }
        }
      });

      // Upload Thumbnail Novel
      const dataThumbnail = await this.cloudinaryService.uploadImageBookByUrl({
        url: thumbnail,
        type: 'thumbnail',
        width: 1000,
        height: 1000,
      });

      // Update Thumbnail, Tag And Author Book
      const updateBookRes = await this.prismaService.book.update({
        where: {
          bookId: bookRes?.bookId
        },
        data: {
          thumbnail: dataThumbnail?.image,
          author: {
            connectOrCreate: {
              where: {
                name: author
              },
              create: {
                name: author
              }
            }
          },
          tags: {
            deleteMany: {},
            create: tags?.map((tag) => ({
              tag: {
                connectOrCreate: {
                  where: {
                    tagId: tag,
                  },
                  create: {
                    tagId: tag
                  }
                }
              }
            }))
          }
        }
      });

      // Create Multiple Chapter
      const chapterRes =  await this.createMultipleChaptersBook({
        bookId: checkBook?.bookId,
        bookUrl: bookUrl,
        start: 0,
        take: +take,
      });

      return {
        success: true,
        type: type,
        bookUrl: bookUrl,
        book: dataBook,
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
    bookId,
    bookUrl,
    start,
    take,
  }: {
    bookId: number;
    bookUrl: string;
    start: number;
    take: number;
  }) {
    const n = start + take;
    let i = start + 1;
    let listChapter = [];
    let check = []
    try {
      while (i <= n) {
        const dataChapter = await this.crawlChapter(
          bookUrl + '/chapter-' + i,
        );

        // return dataChapter;

        if (!dataChapter?.success) {
          throw new Error(`Error crawling chapter ${i}: ${dataChapter?.error}`);
        }
    
        const imagesChapter =
          await this.cloudinaryService.uploadImagesChapterByUrl({
            listUrl: dataChapter?.chapter.content,
          });

        listChapter.push({
          bookId: bookId,
          chapterNumber: i,
          title: dataChapter?.chapter.title,
          content: JSON.stringify(imagesChapter?.images),
        });

        if (listChapter?.length >= 10 || n === i) {
          // Create Chapter Novel
          const chapterRes = await this.prismaService.chapter.createMany({
            data: listChapter?.map((chapter) => chapter),
          });
          if (!chapterRes) {
            throw new Error(`Error creating chapters`);
          }
          listChapter = [];
        }

        // If the next chapter doesn't exist
        if (!dataChapter?.isNext) {
          if(listChapter?.length > 0) {
            throw new Error(`Error crawling chapter ${i}: ${dataChapter?.error}`);
          }
          break;
        }
        i++;
      }

      return {
        success: true,
        check: check,
        message: "Create chapters successfully"
      };
    } catch (error) {
      if (listChapter?.length > 0) {
        try {
          const chapterRes = await this.prismaService.chapter.createMany({
            data: listChapter?.map((chapter) => chapter),
          });

          if (!chapterRes) {
            throw new Error('Error creating remaining chapters');
          }
          return {
            success: true,
            check: check,
            message: "Create chapters successfully"
          }
        } catch (remainingChaptersError) {
          return {
            success: false,
            error: `Error creating remaining chapters: ${remainingChaptersError?.message}`,
          };
        }
        listChapter = [];
      }
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }


  // Crawl Book
  async crawlBook(type: "lxhentai" | "hentaivn", url: string) {
    try {
      const randomUserAgent =
        userAgents[Math.floor(Math.random() * userAgents.length)];

      const response = await axios.get(url, {
        headers: {
          'User-Agent': randomUserAgent,
        },
      });
      const $ = cheerio.load(response.data);
      let title = ""
      let thumbnail = null;
      let description = ""
      let anotherName = ""
      let status = 1
      let author = ""
      let tags = []
      let chapterNextUrl = null;

      // HENTAIVN FAKE
      // const title = $(`title`)
      //   .text()
      //   .match(/Truyện Hentai: (.+?) \| Đọc Online/)[1];
      // const anotherName = '';
      // const thumbnail = $('.page-ava img').attr('src');
      // const status = 1;
      // const author = $('.page-info a[href*="/tacgia="]').text();
      // const description = '';
      // const tags = []
      // $('.tag').each((index, element) => {
      //   const href = $(element).attr('href');
      //   const match = href.match(/\/the-loai-(\d+)-/);
      //   if (match) {
      //     const number = parseInt(match[1], 10);
      //     tags.push(number);
      //   }
      // });
      // const chapterNextUrl = $('.watch-online a').attr('href');

      if(type === "lxhentai") {
        title = $('title').text().split("- LXHENTAI")[0].trim();
        
        const urlMatch = /url\('([^']+)'\)/.exec($('.rounded-lg.cover').attr('style'));
        thumbnail = urlMatch ? urlMatch[1] : null;

        $('.bg-gray-500.hover\\:bg-gray-600.text-white.rounded.px-2.text-sm.inline-block').each((index, element) => {
          tags.push($(element).text());
        });
      }

      return {
        success: true,
        chapterNextUrl: chapterNextUrl,
        book: {
          title: title,
          thumbnail: thumbnail,
          description: description,
          anotherName: anotherName,
          status: status,
          author: author,
          tags: tags,
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
  async crawlChapter(url: string) {
    try {
      const randomUserAgent =
        userAgents[Math.floor(Math.random() * userAgents.length)];

      const response = await axios.get(url, {
        headers: {
          'User-Agent': randomUserAgent,
        },
      });
      const $ = cheerio.load(response.data);
      const title = '';
      const content = $('.lazy.max-w-full.my-0.mx-auto')
        .map((index, element) => $(element).attr('src'))
        .get();
      const isNext = !$('a#btn-next button').hasClass('cursor-not-allowed');

      return {
        success: true,
        isNext: isNext,
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

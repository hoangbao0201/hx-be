import axios from 'axios';
import * as cheerio from 'cheerio';
import userAgent from 'random-useragent';
import { Injectable } from '@nestjs/common';
import { listTagToId } from '../constants/data';
import { textToSlug } from '../utils/textToSlug';
import { CrawlBookDTO } from './dto/crawl-book.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlChapterDTO } from './dto/crawl-chapter.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CrawlService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Create Novel
  async createBook(userId: number, { type, bookUrl }: CrawlBookDTO) {

    try {
      try {
        // Crawl Data Novel
        const dataBook = await this.crawlBook(type, bookUrl);        

        if(!dataBook?.success) {
          throw new Error("Error crawling book");
        }

        // return {
        //   success: true,
        //   bookUrl: bookUrl,
        //   dataBook: dataBook
        // }

        // Create Book
        const { title, anotherName, author, description, status, tags, thumbnail, next } = dataBook?.book;
        const bookRes = await this.prismaService.book.create({
          data: {
            title: title,
            next: dataBook?.book.next,
            slug: textToSlug(title),
            anotherName: anotherName,
            description: description,
            status: status,
            scrapedUrl: bookUrl,
            postedBy: {
              connect: {
                userId: userId
              }
            },
          },
        });
        // Upload Thumbnail Novel
        const dataThumbnail = await this.cloudinaryService.uploadImageBookByUrl({
          url: thumbnail,
          folder: `/${bookRes?.bookId}`,
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

        return {
          success: true,
          type: type,
          book: {
            ...dataBook?.book,
            thumbnail: dataThumbnail?.image
          },
        };
      }
      catch (error) {
        if (error.code === 'P2002') {
          const book = await this.prismaService.book.findFirst({
            where: {
              scrapedUrl: bookUrl,
            }
          })
          return {
              success: true,
              book: book
          };
        }
        return {
            success: false,
            message: 'Error create book',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  // Create Chapters
  async createChapters(userId: number, { type = "lxhentai", bookUrl, take = 1 }: CrawlChapterDTO) {
    try {
      // Get Book
      const bookRes = await this.prismaService.book.findUnique({
        where: {
          scrapedUrl: bookUrl
        },
        select: {
          bookId: true,
          next: true,
          chapters: {
            take: 1,
            orderBy: {
              chapterNumber: "desc"
            },
            select: {
              next: true,
              chapterNumber: true
            }
          },
          _count: {
            select: {
              chapters: true
            }
          }
        }
      });
      if(!bookRes) {
        throw new Error("Error crawling chapters");
      }

      let chapterRes = null;
      if(bookRes?._count.chapters > 0) {
        // Create Multiple Chapter
        chapterRes =  await this.createMultipleChaptersBook({
          type: type,
          bookId: bookRes?.bookId,
          chapterUrl: bookRes?.chapters[0].next,
          start: bookRes?._count.chapters,
          take: +take,
        });

        if(!chapterRes?.success) {
          // throw new Error(JSON.stringify(chapterRes?.error));
          return {
            success: false,
            error: chapterRes?.error,
          };
        }
      }
      else {
        // Create Multiple Chapter
        chapterRes =  await this.createMultipleChaptersBook({
          type: type,
          bookId: bookRes?.bookId,
          chapterUrl: bookRes?.next,
          start: bookRes?._count.chapters,
          take: +take,
        });

        if(!chapterRes?.success) {
          // throw new Error(JSON.stringify(chapterRes?.error));
          return {
            success: false,
            error: chapterRes?.error,
          };
        }
      }

      // Update the corresponding book's updatedAt field
       await this.prismaService.book.update({
        where: { bookId: bookRes?.bookId },
        data: { updatedAt: new Date() },
      });

      return {
        success: true,
        message: 'Create chapters successfully',
        chapters: chapterRes,
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
    bookId,
    chapterUrl,
    start,
    take,
  }: {
    type: "lxhentai" | "hentaivn"
    bookId: number;
    chapterUrl: string;
    start: number;
    take: number;
  }) {
    const n = start + take;
    let i = start + 1;
    let listChapter = [];
    let urlQuery = chapterUrl;
    try {
      while (i <= n) {
        const dataChapter = await this.crawlChapter(type, urlQuery);
        
        if (!dataChapter?.success) {
          throw new Error(`Error crawling chapter ${i}: ${dataChapter?.error}`);
        }

        // return {
        //   success: true,
        //   chapterUrl,
        //   dataChapter
        // };
        
        const baseUrl = new URL(urlQuery).origin
        const imagesChapter =
          await this.cloudinaryService.uploadImagesChapterByUrl({
            baseUrl: baseUrl,
            folder: `/${bookId}/chapters/${i}`,
            listUrl: dataChapter?.chapter.content,
          });
        
        console.log(imagesChapter);
        if(!imagesChapter?.success || imagesChapter?.images.length === 0) {
          this.cloudinaryService.deleteFolder({ folderId: `/${bookId}/chapters/${i}` });
          return {
            success: false,
            message: "Failed to create images",
            error: JSON.stringify(imagesChapter?.error)
          }
        }

        listChapter.push({
          bookId: bookId,
          chapterNumber: i,
          next: dataChapter?.next,
          title: dataChapter?.chapter.title,
          content: JSON.stringify(imagesChapter?.images),
        });

        if (listChapter?.length >= 2 || n === i) {
          // Create Chapter Book
          const chapterRes = await this.prismaService.chapter.createMany({
            data: listChapter?.map((chapter) => chapter),
          });
          if (!chapterRes) {
            throw new Error(`Error creating chapters`);
          }
          console.log("Get chapter " + i + " successfully");
          listChapter = [];
        }

        // If the next chapter doesn't exist
        if (!dataChapter?.next) {
          if(listChapter?.length > 0) {
            throw new Error(`Error crawling chapter ${i}: ${dataChapter?.error}`);
          }
          break;
        }

        urlQuery = dataChapter?.next
        i++;
      }

      return {
        success: true,
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
            message: "Create chapters successfully",
          }
        } catch (remainingChaptersError) {
          return {
            success: false,
            error: `Error creating remaining chapters: ${remainingChaptersError?.message}`,
          };
        }
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
      const baseUrl = new URL(url).origin
      const response = await axios.get(url, {
        headers: {
          referer: baseUrl,
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': "?0",
          'Sec-Ch-Ua-Platform': "Windows",
          'User-Agent': userAgent?.getRandom()
        },
      });
      const $ = cheerio.load(response.data);
      let title = ""
      let thumbnail = null;
      let description = ""
      let anotherName = ""
      let status = 1
      let author = ""
      let tags = [];
      let next = null;

      if(type === "lxhentai") {
        title = $('title').text().split("- LXHENTAI")[0].trim();
        const urlMatch = /url\('([^']+)'\)/.exec($('.rounded-lg.cover').attr('style'));
        thumbnail = urlMatch ? urlMatch[1] : null;
        $('.bg-gray-500.hover\\:bg-gray-600.text-white.rounded.px-2.text-sm.inline-block').each((index, element) => {
          const tag = $(element).text().trim();
          if(listTagToId[tag]) {
            tags.push(listTagToId[tag]);
          }
        });
        next = $(".overflow-y-auto.overflow-x-hidden>a").last().attr("href");
      }
      else if(type === "hentaivn") {
        title = $(`.page-ava img`).attr('alt').split("Truyện hentai")[1].trim();
        const text = $('title').text().match(/\[(.*?)\]/);
        anotherName = text ? text[1] : "";
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
          next: next.length > 0 ? new URL(url).origin + next : null
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
  async crawlChapter(type: "lxhentai" | "hentaivn", url: string) {
    try {
      const baseUrl = new URL(url).origin;
      const response = await axios.get(url, {
        headers: {
          referer: baseUrl,
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': "?0",
          'Sec-Ch-Ua-Platform': "Windows",
          'User-Agent': userAgent?.getRandom()
        },
      });
      const $ = cheerio.load(response.data);

      let title = "";
      let content = [];
      let next = null;

      if(type === "lxhentai") {
        title = '';
        content = $('.lazy.max-w-full.my-0.mx-auto')
          .map((index, element) => $(element).attr('src'))
          .get();
        let nextChapter = $('a#btn-next').attr("href");
        next = nextChapter === "javascript:nm5213(0)" ? null : new URL(url).origin + nextChapter;
      }
      else if(type === "hentaivn") {
        title = '';
        content = $('#image img')
          .map((index, element) => $(element).attr('data-src'))
          .get();
        const nextChapter = $('#nextLink.b-next').attr("href");
        next = nextChapter ? new URL(url).origin + "/" + nextChapter : null;
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

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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CrawlService {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Create Novel
  async createBook(userId: number, { type, bookUrl, email }: CrawlBookDTO) {

    try {
      try {
        // Get Accout Cloud
        const cloud = await this.getAccoutCloudinary(email);
        if(!cloud?.success || !cloud?.cloud) {
          return {
            success: false,
            error: "Accout Not Found"
          }
        }

        // Crawl Data Novel
        const dataBook = await this.crawlBook(type, bookUrl.trim());

        if(!dataBook?.success) {
          throw new Error("Error crawling book");
        }

        // return {
        //   success: false,
        //   bookUrl: bookUrl,
        //   dataBook: dataBook,
        //   cloud: cloud
        // }

        // Create Book
        const { title, anotherName, author, description, status, tags, thumbnail, next } = dataBook?.book;
        const bookRes = await this.prismaService.book.create({
          data: {
            title: title,
            nameImage: cloud?.cloud.name,
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
          name: cloud?.cloud.name,
          key: cloud?.cloud.key,
          secret: cloud?.cloud.secret,
        });

        // Update Thumbnail, Tag And Author Book
        await this.prismaService.book.update({
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
            },
            accoutsCloudBook: {
              connectOrCreate: {
                where: {
                  bookId_name: {
                    bookId: bookRes?.bookId,
                    name: cloud?.cloud.name
                  }
                },
                create: {
                  name: cloud?.cloud.name,
                }
              }
            }
          }
        });

        await this.prismaService.accoutCloudinary.update({
          where: {
            email: cloud?.cloud.email
          },
          data: {
            byte: {
              increment: dataThumbnail?.bytes
            }
          }
        })

        return {
          success: true,
          type: type,
          book: {
            ...dataBook?.book,
            nameImage: cloud?.cloud.name,
            thumbnail: dataThumbnail?.image
          },
        };
      }
      catch (error) {
        if (error.code === 'P2002') {
          const book = await this.prismaService.book.findUnique({
            where: {
              scrapedUrl: bookUrl,
            }
          })
          return {
              success: true,
              exist: true,
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
  async createChapters(userId: number, { email, type = "lxhentai", bookUrl, take = 1 }: CrawlChapterDTO) {
    try {

      // Get Book
      const bookRes = await this.prismaService.book.findUnique({
        where: {
          scrapedUrl: bookUrl.trim()
        },
        select: {
          bookId: true,
          next: true,
          chapters: {
            take: 2,
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
        return {
          success: false,
          error: "Error crawling chapters."
        }
      }

      // Get Accout Cloud
      const cloud = await this.getAccoutCloudinary(email);
      if(!cloud?.success || !cloud?.cloud) {
        return {
          success: false,
          error: "Accout Not Found"
        }
      }

      if(bookRes?.chapters.length > 0 && !bookRes?.chapters[0].next) {
        const dataChapter = await this.crawlChapter(type, bookRes?.chapters.length>1 ? bookRes?.chapters[1].next : bookRes?.next);

        if(dataChapter?.success && !dataChapter?.next) {
          return {
            success: false,
            error: "Currently at the latest chapter."
          }
        }
        bookRes.chapters[0].next = dataChapter?.next
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
          cloud: cloud?.cloud
        });
        
        if(!chapterRes?.success) {
          return {
            success: false,
            error: "Crawl error."
          }
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
          cloud: cloud?.cloud
        });

        if(!chapterRes?.success) {
          return {
            success: false,
            error: "Crawl error."
          }
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
    cloud
  }: {
    type: "lxhentai" | "hentaivn"
    bookId: number;
    chapterUrl: string;
    start: number;
    take: number;
    cloud: {
      email: string,
      name: string,
      key: string,
      secret: string,
      byte: number
    }
  }) {
    const n = start + take;
    let i = start + 1;
    let listChapter = [];
    let urlQuery = chapterUrl;
    let bytes = 0;
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
            cloud: {
              name: cloud?.name,
              key: cloud?.key,
              secret: cloud?.secret,
            },
            baseUrl: baseUrl,
            folder: `/${bookId}/chapters/${i}`,
            listUrl: dataChapter?.chapter.content,
          });
        
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
          nameImage: cloud?.name,
          content: JSON.stringify(imagesChapter?.images),
        });
        bytes += imagesChapter?.bytes;

        if (listChapter?.length >= 2 || n === i) {
          // Create Chapter Book
          const chapterRes = await this.prismaService.chapter.createMany({
            data: listChapter?.map((chapter) => chapter),
          });
          if (!chapterRes) {
            throw new Error(`Error creating chapters`);
          }
          await this.prismaService.accoutCloudinary.update({
            where: {
              email: cloud?.email
            },
            data: {
              byte: {
                increment: bytes
              }
            }
          });
          console.log("Get chapter " + i + " successfully");
          listChapter = [];
          bytes = 0;
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
          await this.prismaService.accoutCloudinary.update({
            where: {
              email: cloud?.email
            },
            data: {
              byte: {
                increment: bytes
              }
            }
          });
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
        author = $('.mt-2 .text-blue-500').first().text()
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

  async getAccoutCloudinary(email: string) {
    try {
      const cloud = await this.prismaService.accoutCloudinary.findUnique({
        where: {
          email: email
        },
        select: {
          email: true,
          name: true,
          key: true,
          secret: true,
          byte: true
        }
      });

      return {
        success: true,
        cloud: cloud
      }
    } catch (error) {
      return {
        success: false,
        error: error
      }
    }
  }


}

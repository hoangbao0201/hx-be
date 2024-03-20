import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';


@Injectable()
export class AdminService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService
  ) {}

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
          accoutsCloudBook: {
            select: {
              accoutCloud: {
                select: {
                  name: true,
                  email: true,
                  byte: true
                }
              }
            }
          },
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

  async findAllAccoutCloud(
    user: { userId: number; username: string; role: { name: string } },
    options: { take?: number; skip?: number; sort?: 'desc' | 'asc' },
  ) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    const { take = 50, skip = 0, sort = 'desc' } = options;

    try {
      const accouts = await this.prismaService.accoutCloudinary.findMany({
        take: +take,
        skip: +skip,
        orderBy: {
          updatedAt: sort,
        },
        select: {
          name: true,
          key: true,
          secret: true,
          email: true,
          byte: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        accouts: accouts,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async createAccoutCloud(
    user: { userId: number; username: string; role: { name: string } },
    options: { email: string, name: string, key: string, secret: string },
  ) {
    if (user?.role.name !== 'admin') {
      return {
        success: false,
        error: 'You are not an admin',
      };
    }

    const { email, name, key, secret } = options;

    try {
      const accout = await this.prismaService.accoutCloudinary.create({
        data: {
          email: email,
          name: name,
          key: key,
          secret: secret,
        }
      });

      return {
        success: true,
        accout: accout,
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

  async changeCloudBook({ bookId, email }: { bookId: string, email: string }) {
    try {
      // Get Accout Cloud
      const cloud = await this.getAccoutCloudinary(email);
      if(!cloud?.success || !cloud?.cloud) {
        return {
          success: false,
          error: "Accout Not Found"
        }
      }

      if(cloud?.cloud.byte/(1024*1024) > 400) {
        return {
          success: false,
          error: cloud?.cloud.email + " is currently at 400MB of your plan limit."
        }
      }

      const book = await this.prismaService.book.findUnique({
        where: {
          bookId: +bookId
        },
        select: {
          nameImage: true,
          thumbnail: true,
        }
      });

      const image = await this.cloudinaryService.changeCloudBook({
        bookId: +bookId,
        oldImage: `https://res.cloudinary.com/${book?.nameImage}/image/upload/${book?.thumbnail}`,
        name: cloud?.cloud.name,
        key: cloud?.cloud.key,
        secret: cloud?.cloud.secret
      });
      if(!image?.success) {
        throw new Error("Upload image error");
      }
      const bookUpdate = await this.prismaService.book.update({
        where: {
          bookId: +bookId
        },
        data: {
          nameImage: cloud?.cloud.name,
          thumbnail: image?.urlImage,
          updatedAt: undefined,
        },
      });

      await this.prismaService.accoutCloudinary.update({
        where: {
          name: cloud?.cloud.name,
        },
        data: {
          books: {
            connectOrCreate: {
              where: {
                bookId_name: {
                  bookId: +bookId,
                  name: cloud?.cloud.name
                }
              },
              create: {
                bookId: +bookId
              }
            }
          },
          byte: {
            increment: image?.bytes
          }
        }
      });

      console.log("END ======================");

      return {
        success: true,
        book: bookUpdate
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async changeCloudChapters({ take, bookId, email }: { take: string, bookId: string, email: string }) {
    try {
      // Get Accout Cloud
      // const cloud = await this.getAccoutCloudinary(email);
      const clouds = await this.prismaService.accoutCloudinary.findMany({
        where: {
          OR: [
            {
              books: {
                some: {
                  bookId: +bookId
                }
              }
            },
            {
              email: email
            }
          ]
        },
        select: {
          name: true,
          key: true,
          secret: true,
          email: true,
          byte: true
        }
      });
      if(clouds.length <= 0 || !clouds) {
        return {
          success: false,
          error: "Accout Not Found"
        }
      }

      // return {
      //   success: false,
      //   clouds: clouds
      // }

      // Check Cloud With Email
      const dataCloud = clouds.find(cloud => cloud.email === email);
      if(!dataCloud) {
        return {
          success: false,
          error: "Accout Not Found"
        }
      }

      if(dataCloud?.byte/(1024*1024) > 400) {
        return {
          success: false,
          error: dataCloud?.email + " is currently at 400MB of your plan limit."
        }
      }

      const chapters = await this.prismaService.chapter.findMany({
        take: +take || 1,
        where: {
          bookId: +bookId,
          nameImage: {
            notIn: clouds.map(cloud => cloud?.name)
          }
        },
        select: {
          chapterNumber: true,
          nameImage: true,
          content: true,
        }
      });
      if(chapters?.length === 0 || !chapters) {
        return {
          success: true,
          message: "All cloud chapters have been changed."
        }
      }

      let bytes = 0;
      for(const chapter of chapters) {
        const images = await this.cloudinaryService.changeCloudChapters({
          content: JSON.parse(chapter?.content),
          oldNameImage: chapter?.nameImage,
          name: dataCloud?.name,
          key: dataCloud?.key,
          secret: dataCloud?.secret
        });
        if(!images?.success || !images?.images) {
          throw new Error("Change Cloud Chapter " + chapter?.chapterNumber + " Error")
        }
        await this.prismaService.chapter.update({
          where: {
            chapterNumber_bookId: {
              bookId: +bookId,
              chapterNumber: chapter?.chapterNumber
            },
          },
          data: {
            nameImage: dataCloud?.name
          }
        });
        bytes += images?.bytes;
        console.log("Change Cloud Chapter " + chapter?.chapterNumber + " Successfully");

        if((dataCloud?.byte + bytes)/(1024*1024)>400) {
          await this.prismaService.accoutCloudinary.update({
            where: {
              name: dataCloud?.name,
            },
            data: {
              books: {
                connectOrCreate: {
                  where: {
                    bookId_name: {
                      bookId: +bookId,
                      name: dataCloud?.name
                    }
                  },
                  create: {
                    bookId: +bookId
                  }
                }
              },
              byte: {
                increment: bytes
              }
            }
          });
    
          console.log("END ======================");
          return {
            success: false,
            error: dataCloud?.email + " is currently at 400MB of your plan limit."
          }
        }
      }
      
      await this.prismaService.accoutCloudinary.update({
        where: {
          name: dataCloud?.name,
        },
        data: {
          books: {
            connectOrCreate: {
              where: {
                bookId_name: {
                  bookId: +bookId,
                  name: dataCloud?.name
                }
              },
              create: {
                bookId: +bookId
              }
            }
          },
          byte: {
            increment: bytes
          }
        }
      });

      console.log("END ======================");

      return {
        success: true,
        bytes: ((bytes+dataCloud?.byte)/(1024*1024)).toFixed(2),
        chapterCount: chapters?.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  async deleteCloud(name: string) {
    try {
      const cloud = await this.prismaService.accoutCloudinary.delete({
        where: {
          name: name
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

  async getAccoutCloudinary(email: string) {
    try {
      const cloud = await this.prismaService.accoutCloudinary.findUnique({
        where: {
          email: email
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

  async test(page: number) {
    try {
      const books = await this.prismaService.accoutCloudinary.update({
        where: {
          name: "domksjrw8"
        },
        data: {
          books: {
            connectOrCreate: {
              where: {
                bookId_name: {
                  bookId: 419,
                  name: "domksjrw8"
                }
              },
              create: {
                bookId: 419
              }
            }
          },
        }
      });

      // let i = 1;
      // for(const book of books) {
      //   const updateBooks = await this.prismaService.book.update({
      //     where: {
      //       bookId: book.bookId
      //     },
      //     data: {
      //       updatedAt: book?.createdAt
      //     }
      //   })

      //   console.log("Update bookId: " + book?.bookId + " - STT: " + i);
      //   await this.wait(1000);
      //   i++;
      // }

      // const book = await this.prismaService.book.update({
      //   where: {
      //     bookId: 412
      //   },
      //   data: {
      //     nameImage: "dmz5itizb"
      //   }
      // })

      console.log("END =====================")
      return {
        success: true,
        // books: books
      }
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async updatCloud() {
    try {
      const books = await this.prismaService.book.findMany({ select: { bookId: true } });
      for(const book of books) {
        const chapters = await this.prismaService.chapter.findMany({
          // take: 500,
          // skip: (+page - 1)*500,
          orderBy: {
            createdAt: "desc"
          },
          where: {
            bookId: book?.bookId
          },
          select: {
            nameImage: true,
            bookId: true,
            chapterNumber: true
          }
        });
        let count = 0;
        let oldBookId = null;
        let oldNameImage = null;
        for(const chapter of chapters) {
          if(oldNameImage !== chapter?.nameImage) {
            try {
              const cloudConnect = await this.prismaService.accoutCloudBook.create({
                data: {
                  bookId: chapter?.bookId,
                  name: chapter?.nameImage
                },
                select: {
                  bookId: true,
                  accoutCloud: true
                }
              });
              console.log("bookId: " + chapter?.bookId + ", nameImage: " + chapter?.nameImage)
            } catch (error) {
              if(error.code ===  'P2003') {
                console.log("EEEEEEEEEEEEEEEE - Cloud Not Found: ", {
                  bookId: chapter?.bookId,
                  name: chapter?.nameImage
                });
                // return {
                //   success: false,
                //   error: error,
                //   message: "Cloud Name Not Found: " + chapter?.nameImage + ", BookId: " + chapter?.bookId
                // }
              }
              else if(error.code === "P2002") {
                console.log("bookId: " + chapter?.bookId + ", nameImage: " + chapter?.nameImage)
              }
              else {
                console.log("bookId: " + chapter?.bookId + ", nameImage: " + chapter?.nameImage + " Error: ", error);
              }
              // return {
              //   success: false,
              //   error: error
              // }
            }
            console.log("count: ", count);
            count = 0;
          }
          oldBookId = chapter?.bookId;
          oldNameImage = chapter?.nameImage;
          count++;
        }
        console.log("Successfully -----------------------------------------------------------------------");

        await this.wait(1000);
      }

      // const clouds = await this.prismaService.accoutCloudinary.findMany({})

      return {
        success: true,
        // chapters: chapters,
        // clouds: clouds
        // books: books
      };
    } catch (error) {
      
    }
  }
}

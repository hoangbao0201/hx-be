import { Injectable } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import { Readable } from 'stream';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import userAgent from 'random-useragent';


type CloudinaryResponse = {
  success: boolean;
  image?: UploadApiResponse;
  error?: UploadApiErrorResponse;
};

@Injectable()
export class CloudinaryService {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService
  ) {}

  async uploadImageBookByUrl(data: {
    url: string;
    type?: 'images' | 'thumbnail' | 'chapter';
    width?: number;
    height?: number;
  }) {
    const { url, type = 'images', height = 1000, width = 1000 } = data;
    try {
      const { data: imageBuffer } = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      const result = await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `HX/book/${type}`,
            transformation: [
              {
                width: +width,
                height: +height,
                crop: 'limit',
              },
            ],
          },
          (error, result) => {
            if (error) {
              reject({ success: false, error });
            } else {
              resolve(result?.secure_url.replace(`https://res.cloudinary.com/${this.configService.get("CLOUDINARY_NAME")}/image/upload/`, ""));
            }
          },
        );

        const readableStream = new Readable();
        readableStream.push(Buffer.from(imageBuffer));
        readableStream.push(null);

        readableStream.pipe(uploadStream);
      });

      return {
        success: true,
        image: result,
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async uploadImagesChapterByUrl(data: { listUrl: string[]; width?: number; height?: number; }) {
    const { listUrl = [] } = data;
    let results = [];

    // const { width = 2000, height = 2000 } = data;
    try {
        for (let i = 0; i < listUrl.length; i += 8) {
            const chunkUrls = listUrl.slice(i, i + 8);
            const uploadPromises = chunkUrls.map(async (url) => {
                const { data: imageBuffer } = await axios.get(`${url}`, {
                    responseType: 'arraybuffer',
                    headers: {
                      referer: "https://lxmanga.net",
                      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                      'Sec-Ch-Ua-Mobile': "?0",
                      'Sec-Ch-Ua-Platform': "Windows",
                      'User-Agent': userAgent?.getRandom()
                    },
                });
                // UploadApiResponse
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: `HX/book/chapter`,
                            transformation: [
                                // {
                                //     width: +width,
                                //     height: +height,
                                //     crop: 'limit',
                                // },
                            ],
                        },
                        (error, result) => {
                            if (error) {
                                reject({ success: false, error });
                            } else {
                                resolve(result?.secure_url.replace(`https://res.cloudinary.com/${this.configService.get("CLOUDINARY_NAME")}/image/upload/`, ""));
                            }
                        },
                    );
                    const readableStream = new Readable();
                    readableStream.push(Buffer.from(imageBuffer));
                    readableStream.push(null);

                    readableStream.pipe(uploadStream);
                });
            });

            const chunkResults = await Promise.all(uploadPromises);
            results.push(...chunkResults);
        }

        return {
            success: true,
            images: results,
        };
    } catch (error) {
        return { success: false, error };
    }
  }

  async deleteImageBlog({ imageId }: { imageId: string }) {
    try {
      const uploadStream = cloudinary.uploader.destroy(imageId);

      return {
        success: true,
        uploadStream: uploadStream,
        imageId: imageId,
      };
    } catch (error) {
      return { success: false, error };
    }
  }
}

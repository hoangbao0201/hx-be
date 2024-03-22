import axios from 'axios';
import userAgent from 'random-useragent';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class CloudImageService {
  private s3_client: S3Client;
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    this.s3_client = new S3Client({
      region: this.configService.get('S3Region'),
      credentials: {
        accessKeyId: this.configService.get('Accesskey'),
        secretAccessKey: this.configService.get('SecretAccessKey'),
      },
    });
  }

  // Upload Image Book
  async uploadImageBookOnS3({
    url,
    bookId,
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

  // Upload Images Chapter
  async uploadImagesChapterOnS3(data: {
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
      for (let i = 0; i < listUrl.length; i += 20) {
        const chunkUrls = listUrl.slice(i, i + 20);
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

  wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

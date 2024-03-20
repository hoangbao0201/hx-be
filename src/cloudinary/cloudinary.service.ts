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
    folder: string;
    width?: number;
    height?: number;
    name: string,
    key: string,
    secret: string
  }) {
    const { url, folder = '', height = 1000, width = 1000, name, key, secret } = data;
    try {
      const { data: imageBuffer } = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      // Khởi tạo Cloudinary với thông tin cấu hình từ ConfigService
      cloudinary.config({
        cloud_name: name,
        api_key: key,
        api_secret: secret,
      });

      let bytes = 0;
      const result = await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `HX/books${folder}`,
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
              bytes = result?.bytes;
              resolve(result?.secure_url.replace(`https://res.cloudinary.com/${name}/image/upload/`, ""));
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
        bytes: bytes,
        image: result,
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async uploadImagesChapterByUrl(data: { cloud: { name: string, key: string, secret: string }, baseUrl: string, folder: string, listUrl: string[]; width?: number; height?: number; }) {
    const { cloud, baseUrl = "", folder = "", listUrl = [] } = data;
    let results = [];

    // Khởi tạo Cloudinary với thông tin cấu hình từ ConfigService
    cloudinary.config({
      cloud_name: cloud?.name,
      api_key: cloud?.key,
      api_secret: cloud?.secret,
    });

    try {
        let bytes = 0;
        for (let i = 0; i < listUrl.length; i += 15) {
            const chunkUrls = listUrl.slice(i, i + 15);
            const uploadPromises = chunkUrls.map(async (url) => {
                const { data: imageBuffer } = await axios.get(`${url}`, {
                    responseType: 'arraybuffer',
                    headers: {
                      referer: baseUrl,
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
                            folder: folder,
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
                                bytes += result?.bytes;
                                resolve(result?.secure_url.replace(`https://res.cloudinary.com/${cloud?.name}/image/upload/`, ""));
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

        console.log("bytes: ", bytes)
        return {
            success: true,
            bytes: bytes,
            images: results,
        };
    } catch (error) {
        return { success: false, error };
    }
  }

  async deleteImage({ imageId }: { imageId: string }) {
    try {
      // const deleteStream = cloudinary.uploader.destroy(imageId);
      // const deleteStream = cloudinary.api.delete_all_resources(imageId);

      return {
        success: true,
        // deleteStream: deleteStream,
        imageId: imageId,
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async deleteFolder({ folderId }: { folderId: string }) {
    try {
      // const deleteStream = cloudinary.uploader.destroy(folderId);
      const deleteFolder = await cloudinary.api.delete_folder(folderId);

      return {
        success: true,
        folderId: folderId,
        deleteFolder: deleteFolder,
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async changeCloudChapters({ oldNameImage, content, name, key, secret }: { oldNameImage: string, content: string[], name: string, key: string, secret: string }) {
    try {
      cloudinary.config({
        cloud_name: name,
        api_key: key,
        api_secret: secret,
      });
      
      const results = [];
      let bytes = 0;
      for (let i = 0; i < content?.length; i += 30) {
        const chunkUrls = content.slice(i, i + 30);
        const uploadPromises: Promise<UploadApiResponse>[] = [];

        chunkUrls.map(async (url) => {
          const cvFolderImage = url?.match(/\/(.+)$/)?.[1].split(".")[0] || "";
          console.log(cvFolderImage)
          const upload = cloudinary.uploader.upload(`https://res.cloudinary.com/${oldNameImage}/image/upload/${url}`, { public_id: cvFolderImage });
          uploadPromises.push(upload);
        });

        const chunkResults = await Promise.all(uploadPromises);

        for (const upload of chunkResults) {
          if (!upload) {
            throw new Error("Change cloud error");
          }
          bytes = bytes + upload?.bytes;
          results.push(upload.secure_url?.split("/image/upload/")[1]);
        }
      }

      return {
        success: true,
        bytes: bytes,
        images: results
      }
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  async changeCloudBook({ bookId, oldImage, name, key, secret }: { bookId: number, oldImage: string, name: string, key: string, secret: string }) {
    try {
      cloudinary.config({
        cloud_name: name,
        api_key: key,
        api_secret: secret,
      });
            
      const upload_result = await cloudinary.uploader.upload(oldImage, { folder: `HX/books/${bookId}`}); 
      if(!upload_result) {
        throw new Error("Change cloud error");
      }

      return {
        success: true,
        bytes: upload_result?.bytes,
        urlImage: upload_result?.secure_url?.split("/image/upload/")[1]
      }
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
}


// {
//   asset_id: '38c7d5dc795c981c173a493e28ad6c1b',
//   public_id: 'HX/books/279/yanzqmyfeg8bqsycyn98',
//   version: 1710700698,
//   version_id: '604c1bd5a1fdf2673a274b9da50b371a',
//   signature: '8e2eac2bbeaafa87e34b27bc5334adf20eac5d2a',
//   width: 500,
//   height: 662,
//   format: 'jpg',
//   resource_type: 'image',
//   created_at: '2024-03-17T18:38:18Z',
//   tags: [],
//   bytes: 75140,
//   type: 'upload',
//   etag: '88ad6c7b15c9f5cf46976a8f688533dd',
//   placeholder: false,
//   url: 'http://res.cloudinary.com/djlg4zd3i/image/upload/v1710700698/HX/books/279/yanzqmyfeg8bqsycyn98.jpg',       
//   secure_url: 'https://res.cloudinary.com/djlg4zd3i/image/upload/v1710700698/HX/books/279/yanzqmyfeg8bqsycyn98.jpg',
//   folder: 'HX/books/279',
//   original_filename: 'mytcqcripqmsfmwcrdmw',
//   api_key: '624958517373894'
// }
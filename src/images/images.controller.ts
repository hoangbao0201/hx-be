import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res } from '@nestjs/common';
import { ImagesService } from './images.service';
import axios from 'axios';
import userAgent from 'random-useragent';
import { Response } from 'express';


@Controller('api/images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get()
  async findOne(
    @Query('slug') slug: string,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    try {
      if(!slug) {
        throw new Error("Slug or Type not found");
      }
      const response = await axios.get(slug, {
        responseType: 'stream',
        headers: {
          referer: type ? type : new URL(slug).origin,
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': "?0",
          'Sec-Ch-Ua-Platform': "Windows",
          'User-Agent': userAgent?.getRandom()
        },
      });
      response.data.pipe(res);
    } catch (error) {
      return {
        success: false,
        error: error
      }
    }
  }
  
}

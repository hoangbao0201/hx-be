import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res } from '@nestjs/common';
import { ImagesService } from './images.service';
import axios from 'axios';
import userAgent from 'random-useragent';


@Controller('api/images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  // @Get()
  // async findOne(@Query('slug') slug: string, @Res() res: Response) {

  //   const response = await axios.get(slug, {
  //     responseType: 'stream',
  //     // responseType: 'arraybuffer',
  //     headers: {
  //       referer: "https://lxmanga.net",
  //       'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  //       'Sec-Ch-Ua-Mobile': "?0",
  //       'Sec-Ch-Ua-Platform': "Windows",
  //       'User-Agent': userAgent?.getRandom()
  //     },
  //   });

    // return {
    //   success: true,
    //   image: JSON.stringify(response.data)
    // };
  //   response.data.pipe(res);
  // }
  
}

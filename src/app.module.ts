import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BookModule } from './book/book.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { CrawlModule } from './crawl/crawl.module';
import { ImagesModule } from './images/images.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommentModule } from './comment/comment.module';
import { ChapterModule } from './chapter/chapter.module';
import { CloudImageModule } from './cloud-image/cloud-image.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    CrawlModule,
    ImagesModule,
    ChapterModule,
    BookModule,
    CommentModule,
    AdminModule,
    CloudImageModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

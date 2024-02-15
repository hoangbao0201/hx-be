import { IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CrawlBookDTO {

    @IsString()
    @IsNotEmpty()
    bookUrl: string

    // @IsOptional()
    // nextChapter?: string

    @IsString()
    @IsOptional()
    take?: number
} 
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class CrawlChapterDTO {

    @IsString()
    @IsNotEmpty()
    bookUrl: string

    @IsString()
    @IsOptional()
    @IsIn(["lxhentai", "hentaivn"])
    type: "lxhentai" | "hentaivn"

    @IsNumber()
    @IsOptional()
    take: number
} 
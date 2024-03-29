import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CrawlBookDTO {

    @IsString()
    @IsNotEmpty()
    bookUrl: string

    @IsString()
    @IsOptional()
    @IsIn(["lxhentai", "hentaivn"])
    type: "lxhentai" | "hentaivn"
} 
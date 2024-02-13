import { IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CrawlBookDTO {

    @IsString()
    @IsNotEmpty()
    bookUrl: string

    @IsString()
    @IsOptional()
    take?: number
} 
import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({ example: 'Filete de Res' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Filete de res a la parrilla con papas fritas', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Platos Principales', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 24.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 50, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

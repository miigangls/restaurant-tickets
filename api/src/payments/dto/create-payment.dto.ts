import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ example: 'stripe' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'txn_123456', required: false })
  @IsOptional()
  @IsString()
  providerRef?: string;
}

import { IsString, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { CompartmentSize } from '../../../common/types/compartment-size.enum';

export class CompartmentDto {
  @IsString()
  shelfNo: string;

  @IsEnum(CompartmentSize)
  size: CompartmentSize;

  @IsNumber()
  boardNo: number;

  @IsNumber()
  lockNo: number;

  @IsUUID()
  lockerId: string;
}
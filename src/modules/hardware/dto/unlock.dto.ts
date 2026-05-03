import { IsNumber, IsNotEmpty } from 'class-validator';

export class UnlockDto {
  @IsNumber()
  @IsNotEmpty()
  boardNo: number;

  @IsNumber()
  @IsNotEmpty()
  lockNo: number;
}
import { PartialType } from '@nestjs/swagger';
import { CreateBrandKitDto } from './create-brand-kit.dto';

export class UpdateBrandKitDto extends PartialType(CreateBrandKitDto) {}

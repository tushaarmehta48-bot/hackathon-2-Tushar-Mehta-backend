import { PartialType } from '@nestjs/mapped-types';
import { CreatePackageDto } from './create-package.dto.js';

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}

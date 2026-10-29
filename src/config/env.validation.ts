import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 3001;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 3001;
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  PORT = 3001;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  MONGODB_URI!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @MinLength(16)
  @IsOptional()
  SESSION_SECRET?: string;

  @IsString()
  @IsOptional()
  BOOTSTRAP_ADMIN_EMAIL?: string;

  @IsString()
  @IsOptional()
  BOOTSTRAP_ADMIN_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}

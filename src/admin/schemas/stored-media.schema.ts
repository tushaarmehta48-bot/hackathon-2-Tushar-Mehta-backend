import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StoredMediaDocument = HydratedDocument<StoredMedia>;

@Schema({ timestamps: true, collection: 'stored_media' })
export class StoredMedia {
  @Prop({ required: true, unique: true, index: true })
  filename!: string;

  @Prop({ required: true })
  contentType!: string;

  @Prop({ type: Buffer, required: true })
  data!: Buffer;

  @Prop({ required: true })
  size!: number;
}

export const StoredMediaSchema = SchemaFactory.createForClass(StoredMedia);

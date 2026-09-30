import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { FileStorageService } from './file-storage.service';
import { ImageFileValidationPipe } from './pipes/image-file-validation.pipe';

@Module({
  imports: [AuditModule],
  controllers: [BooksController],
  providers: [BooksService, FileStorageService, ImageFileValidationPipe],
  exports: [BooksService, FileStorageService],
})
export class BooksModule {}

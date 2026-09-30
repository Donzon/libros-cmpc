import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('CMPC-libros API')
    .setDescription(
      'API REST del inventario de libros. Todas las rutas requieren ' +
        '`Authorization: Bearer <accessToken>` salvo `POST /api/auth/login` ' +
        'y `GET /api/health`.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Serves Swagger UI at /api/docs and the raw spec at /api/docs-json. */
export function configureSwagger(app: INestApplication): OpenAPIObject {
  const document = buildSwaggerDocument(app);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  return document;
}

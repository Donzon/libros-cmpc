import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

export const SkipTransform = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_TRANSFORM_KEY, true);

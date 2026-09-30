import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('conecta en onModuleInit y desconecta en onModuleDestroy', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://cmpc:cmpc@localhost:5432/cmpc_libros_test';

    const service = new PrismaService();
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);

    connect.mockRestore();
    disconnect.mockRestore();
  });
});

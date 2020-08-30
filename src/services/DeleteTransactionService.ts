import { getCustomRepository } from 'typeorm';
import { validate as uuidValidate } from 'uuid';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    if (!uuidValidate(id)) {
      throw new AppError('Invalid id');
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne(id);
    if (!transaction) {
      throw new AppError('transaction not exists');
    }
    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;

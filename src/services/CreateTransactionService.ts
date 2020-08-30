import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Transaction type invalid');
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    const { total } = await transactionsRepository.getBalance();

    if (value > total && type === 'outcome') {
      throw new AppError('Insufficient balance to carry out the transaction');
    }

    const categoryFindOrCreate = await categoriesRepository.findOrCreate(
      category,
    );

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: categoryFindOrCreate,
    });

    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;

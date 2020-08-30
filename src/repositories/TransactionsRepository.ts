import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const balance = transactions.reduce(
      (accumulator: Balance, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += Number(transaction.value);
        } else {
          accumulator.outcome += Number(transaction.value);
        }

        return accumulator;
      },
      { total: 0, income: 0, outcome: 0 },
    );
    balance.total = balance.income - balance.outcome;
    return balance;
  }
}

export default TransactionsRepository;

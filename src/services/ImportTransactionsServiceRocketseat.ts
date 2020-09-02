import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import csvParseConfig from '../config/csvParse';
import CategoriesRepository from '../repositories/CategoriesRepository';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsServiceRocketseat {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoriesCSV: string[] = [];
    const transactionsCSV: CSVTransaction[] = [];

    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse(csvParseConfig);

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      if (!title || !type || !value) {
        // throw new AppError('Error csv file.');
        return;
      }
      categoriesCSV.push(category);
      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const categoriesRepository = getCustomRepository(CategoriesRepository);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const categoriesExists = await categoriesRepository.find({
      where: { title: In(categoriesCSV) },
    });

    const categoriesTitleExists = categoriesExists.map(
      (category: Category) => category.title,
    );

    const categoriestTitleNotExists = categoriesCSV
      .filter(category => !categoriesTitleExists.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      categoriestTitleNotExists.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);
    const allCategories = [...categoriesExists, ...newCategories];

    const transactions = transactionsRepository.create(
      transactionsCSV.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(transactions);
    fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsServiceRocketseat;

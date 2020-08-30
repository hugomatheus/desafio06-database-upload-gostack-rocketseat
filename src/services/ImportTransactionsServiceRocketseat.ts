import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, In } from 'typeorm';
import { request } from 'express';
import Transaction from '../models/Transaction';
import csvParseConfig from '../config/csvParse';
import CategoriesRepository from '../repositories/CategoriesRepository';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Array<string>> {
    const lines = await this.loadCSV(filePath);
    const categoriesCSV: string[] = [];
    const transactionsCSV: CSVTransaction[] = [];
    lines.forEach(line => {
      const [title, type, value, category] = line;
      categoriesCSV.push(category);
      transactionsCSV.push({ title, type, value, category });
    });

    const categoriesRepository = getCustomRepository(CategoriesRepository);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const categoriesExists = await categoriesRepository.find({
      where: { title: In(categoriesCSV) },
    });

    const categoriesTitleExists = categoriesExists.map(
      category => category.title,
    );

    const categoriestTitleNotExists = categoriesCSV.filter(
      category => !categoriesTitleExists.includes(category),
    );

    console.log('categoriestTitleNotExists');
    console.log(categoriestTitleNotExists);

    // await transactionsRepository.save(transaction);

    return lines;
  }

  async loadCSV(filePath: string): any[] {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse(csvParseConfig);

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return lines;
  }
}

export default ImportTransactionsService;

import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, In, getManager } from 'typeorm';
import CategoriesRepository from '../repositories/CategoriesRepository';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsServiceRocketseat {
  async getDataCSV(filePath: string): Promise<Array<{}>> {
    const readCSVStream = fs.createReadStream(filePath);
    const parseStream = csvParse({
      ltrim: true,
      rtrim: true,
      columns: true,
    });
    const parseCSV = readCSVStream.pipe(parseStream);

    const dataCSV: Array<{}> = [];

    parseCSV.on('data', line => {
      dataCSV.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    fs.promises.unlink(filePath);
    return dataCSV;
  }

  async execute(filePath: string) {
    const getDataCSV: Array<{}> = await this.getDataCSV(filePath);
    const categoriesRepository = getCustomRepository(CategoriesRepository);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const dataCSV = getDataCSV as Array<CSVTransaction>;
    const categoriesInDataCSV = dataCSV
      .map(data => data.category)
      .filter((value, index, self) => self.indexOf(value) === index);

    // console.log(categoriesInDataCSV);

    const categoriesInDataCSVInBD = await categoriesRepository.find({
      where: { title: In(categoriesInDataCSV) },
    });

    const categoriesInDataCSVInBDFieldTitle = categoriesInDataCSVInBD.map(
      category => category.title,
    );

    const categoriesInDataCSVNotInBD = categoriesInDataCSV.filter(
      category => !categoriesInDataCSVInBDFieldTitle.includes(category),
    );

    await getManager().transaction(async transactionalEntityManager => {
      const categoriesCreate = categoriesRepository.create(
        categoriesInDataCSVNotInBD.map(category => ({ title: category })),
      );
      const allCategories = [...categoriesCreate, ...categoriesInDataCSVInBD];
      await transactionalEntityManager.save(categoriesCreate);

      const transactionsCreate = transactionsRepository.create(
        dataCSV.map(transaction => ({
          title: transaction.title,
          value: transaction.value,
          type: transaction.type,
          category: allCategories.find(
            category => category.title === transaction.category,
          ),
        })),
      );
      await transactionalEntityManager.save(transactionsCreate);
      return transactionsCreate;
    });
  }
}

export default ImportTransactionsServiceRocketseat;

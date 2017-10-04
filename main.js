import Indexer from './lib/indexer';

require('babel-core/register');
require('babel-polyfill');

// usecase if starting from new.
const indexer = new Indexer();

indexer.login()
  .then(() => indexer.startIndex())
  .then(() => indexer.writeJsonObj())
  .then(() => indexer.writeDownloads())
  .catch((err) => {
    console.log(err);
    indexer.end();
  });


// usecase if already have json file indexing all lessons, sub lessons & download links
// (generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------
// const fs = require('fs');
//
// const obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
// const indexer = new Indexer({ lessons: obj, resume: false });
//
// indexer.login()
//   .then(() => indexer.writeDownloads())
//   .then(() => indexer.end())
//   .catch((err) => {
//     console.log(err);
//     indexer.end();
//   });


// usecase if you have already started writing the downloads and had to stop for one reason
// or another
// (generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------

// const fs = require('fs');
//
// const obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
// const indexer = new Indexer({ lessons: obj, resume: true });
//
// indexer.login()
//   .then(() => indexer.writeDownloads())
//   .then(() => indexer.end())
//   .catch((err) => {
//     console.log(err);
//     indexer.end();
//   });

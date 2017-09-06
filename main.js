require("babel-core/register");
require("babel-polyfill");
const fs = require('fs');
import { Indexer } from './lib/indexer';

//usecase if starting from new.
let indexer = new Indexer();

indexer.login()
.then(() => {return indexer.startIndex()})
.then(() => {return indexer.writeJsonObj()})
.then(() => {return indexer.writeDownloadables()})
.catch((err) => {
  console.log(err);
  indexer.end();
  return;
});


//usecase if already have json file indexing all lessons, sub lessons & download links
//(generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------

// let obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
// let indexer = new Indexer({lessons: obj, resume: false});
//
// indexer.login()
// .then(() => {return indexer.writeDownloadables()})
// .then(() => {return indexer.end()})
// .catch((err) => {
//   console.log(err);
//   index.end();
//   return;
// });


//usecase if you have already started writing the downloads and had to stop for one reason or another
//(generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------

// let obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
// let indexer = new Indexer({lessons: obj, resume: true});
//
// indexer.login()
// .then(() => {return indexer.writeDownloadables()})
// .then(() => {return indexer.end()})
// .catch((err) => {
//   console.log(err);
//   index.end();
//   return;
// });

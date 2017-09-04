require("babel-core/register");
require("babel-polyfill");
const fs = require('fs');
import { Indexer } from './lib/indexer';

//usecase if starting from new.
// let index = new Indexer();
//
// index.login()
// .then((result) => {
//   if (result) {
//     console.log('logged in successfully')
//   } else {
//     console.log('Not logged in...');
//     index.end();
//     return 'err: not logged in';
//   }
//   return index.getParentLessons();
// })
// .then(() => {return index.getChildLessons()})
// .then(() => {return index.getDownloadLinks()})
// .then(() => {return index.writeJsonObj()})
// .then(() => {return index.write()})
// .catch((err) => {
//   console.log(err);
//   index.end();
// });


//usecase if already have json file indexing all lessons, sub lessons & download links
//(generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------

var obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
let index = new Indexer(obj);

index.login()
.then((result) => {
  if (result) {
    console.log('logged in successfully')
  } else {
    console.log('Not logged in...');
    index.end();
    return 'err: not logged in';
  }
  return index.write();
})
.then((res) => {
  console.log(res);
  return index.end();})
.catch((err) => {
  console.log(err);
  index.end();
});

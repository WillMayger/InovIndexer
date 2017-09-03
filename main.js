require("babel-core/register");
require("babel-polyfill");
const fs = require('fs');
import { Pod } from './lib/pod';

//usecase if starting from new.
// let pod = new Pod();
//
// pod.login()
// .then((result) => {
//   if (result) {
//     console.log('logged in successfully')
//   } else {
//     console.log('Not logged in...');
//     pod.end();
//     return 'err: not logged in';
//   }
//   return pod.getParentLessons();
// })
// .then(() => {return pod.getChildLessons()})
// .then(() => {return pod.getDownloadLinks()})
// .then(() => {return pod.write()})
// .catch((err) => {
//   console.log(err);
//   pod.end();
// });


//usecase if already have json file indexing all lessons, sub lessons & download links
//(generated & saved as lessons.json when other usecase has been run)
//------------------------------------------------------------------------------------

var obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));
let pod = new Pod(obj);

pod.login()
.then((result) => {
  if (result) {
    console.log('logged in successfully')
  } else {
    console.log('Not logged in...');
    pod.end();
    return 'err: not logged in';
  }
  return pod.write();
})
.then((res) => {
  console.log(res);
  return pod.end();})
.catch((err) => {
  console.log(err);
  pod.end();
});

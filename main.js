import { Pod } from './pod';
import { GoogleAPI } from './GoogleAPI';
require("babel-core/register");
require("babel-polyfill");

let api = new GoogleAPI();

api.Auth()
.then(() => {
  return api.CreateFolder('wills new folder', ['0B6kmjkNdPZxsOFN1UGQ1Rk1zUDQ']);
})
.then((folderID) => {
  return api.CreateFile('testtwo.mp3', [folderID], 'mp3');
});
//
// let pod = new Pod();
// pod.login()
// .then((result) => {
//   if (result) {
//     console.log('logged in successfully')
//   } else {
//     console.log('Not logged in...');
//   }
//   return pod.getParentLessons();
// })
// .then(() => {return pod.getChildLessons();})
// .then(() => {return pod.getDownloadLinks();})
// .then(() => {
//   console.log(JSON.stringify(pod.lessons.levels[3].childlevels[0].lessons[1]));
//   pod.end();
// })
// .catch((err) => {
//   console.log(err);
//   // console.log(JSON.stringify(pod.lessons));
//   pod.end();
// });

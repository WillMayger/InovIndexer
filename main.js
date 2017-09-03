require("babel-core/register");
require("babel-polyfill");
var fs = require('fs');
import { Pod } from './lib/pod';
var obj = JSON.parse(fs.readFileSync('lessons.json', 'utf8'));


let pod = new Pod(obj);

pod.login()
.then((result) => {
  if (result) {
    console.log('logged in successfully')
  } else {
    console.log('Not logged in...');
  }
  // return pod.getParentLessons();
  return pod.horseman.cookies();
})
.then((res) => {
  console.log(res);
  return pod.end();})
// .then(() => {return pod.getChildLessons()})
// .then(() => {return pod.getDownloadLinks()})
.catch((err) => {
  console.log(err);
  pod.end();
});

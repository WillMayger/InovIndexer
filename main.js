require("babel-core/register");
require("babel-polyfill");
import { Pod } from './lib/pod';

let pod = new Pod();
pod.login()
.then((result) => {
  if (result) {
    console.log('logged in successfully')
  } else {
    console.log('Not logged in...');
  }
  return pod.getParentLessons();
})
.then(() => {return pod.getChildLessons()})
.then(() => {return pod.getDownloadLinks()})
.then(() => {return pod.write()})
.then(() => {return pod.end()})
.catch((err) => {
  console.log(err);
  pod.end();
});

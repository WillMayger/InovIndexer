import { Pod } from './pod';
require("babel-core/register");
require("babel-polyfill");

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
.then((res) => {
  console.log('finished getting child lessons')
  return pod.getDownloadLinks();
})
.then((res) => {
  console.log(JSON.stringify(pod.lessons.levels[3].childlevels[0].lessons[1]));
  pod.end();
})
.catch((err) => {
  console.log(err);
  // console.log(JSON.stringify(pod.lessons));
  pod.end();
});

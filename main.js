import { Pod } from './pod';

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
.then((res) => {console.log(JSON.stringify(res));pod.end();})
.catch((err) => {
  console.log(err);
  console.log(JSON.stringify(pod.lessons));
  pod.end();
});

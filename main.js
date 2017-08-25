import { Pod } from './pod';

let pod = new Pod();
pod.login()
.then((result) => {
  console.log(result);
  return pod.getParentLessons();
})
.then(() => {return pod.getChildLessons()})
.then((res) => {console.log(JSON.stringify(res));pod.end();})
.catch((err) => {console.log(err)});

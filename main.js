import { Pod } from './pod';

let pod = new Pod();
pod.login()
.then((result) => {
  console.log(result);
  return pod.getUpperLessons();
})
.then(() => {pod.end()})
.catch((err) => {console.log(err)});

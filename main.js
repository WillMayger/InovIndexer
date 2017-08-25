import { Pod } from './pod';

let pod = new Pod();
pod.login()
.then((result) => {
  console.log(result);
  return pod.getLessons();
})
.then((res) => {console.log(JSON.stringify(res));pod.end();})
.catch((err) => {console.log(err)});

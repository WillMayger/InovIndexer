import { Pod } from './pod';

let pod = new Pod();
pod.login()
.then((result) => {
  console.log(result);
  return pod.checkLogin();
})
.then((result) => {
  console.log(result);
  return;
})
.then(() => {pod.end()})
.catch((err) => {console.log(err)});

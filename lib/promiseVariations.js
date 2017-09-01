
import { cred } from './cred';
var Horseman = require("node-horseman");
var cheerio = require('cheerio');
var PromisePool = require('es6-promise-pool');

export class Pod {
  constructor(lessonsObj) {
    var horseman = new Horseman();
    this.horseman = horseman;
    this.baseURL = 'https://www.frenchpod101.com/';

    if (lessonsObj !== undefined) {
      this.lessons = lessonsObj;
    } else {
      this.lessons = {
        levels: []
      };
    }
  }

// getChildLessons() {
//   return new Promise((resolve, reject) => {
//     Promise.all(
//
//       //nested for loop is needed to get all information in object / arrays
//      this.lessons.levels.map((item, i) => {
//
//         item.childlevels.map((childItem, iChild) => {
//
//           return ((i, iChild) => {
//
//             //return async process with Promise.resolve();
//             return this.horseman
//             .open(childItem.url)
//             .html()
//             .then((html) => {
//               cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
//                 let lesson = cheerio(elem);
//
//                 childItem.lessons.push(
//                   {name: lesson.text(), url: lesson.attr('href')}
//                 );
//
//               });
//             })
//             .then(() => {
//                 return Promise.resolve();
//             }).catch((err) => {
//               reject(err);
//             });
//
//           })(i, iChild);
//
//         });
//     })
//
//     // Promise.all().then()
//   ).then(() => {
//     resolve(this.lesson);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
// });
// }

// getChildLessons() {
//
//       const promiArray = [];
//
//       //nested for loop is needed to get all information in object / arrays
//      this.lessons.levels.map((item, i) => {
//
//         item.childlevels.map((childItem, iChild) => {
//           promiArray.push(
//             new Promise((resolve, reject) => {
//               let iterator = i;
//               let childIterator = iChild;
//             //return async process with Promise.resolve();
//             console.log();
//             console.log('getting url: ' + this.lessons.levels[iterator].childlevels[childIterator].url);
//              this.horseman
//             .open(this.lessons.levels[iterator].childlevels[childIterator].url)
//             .html()
//             .then((html) => {
//               cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
//                 let lesson = cheerio(elem);
//                 console.log('got url: ' + this.lessons.levels[iterator].childlevels[childIterator].url);
//                 console.log();
//
//
//                 childItem.lessons.push(
//                   {name: lesson.text(), url: lesson.attr('href')}
//                 );
//               });
//             })
//             .then(() => {
//               resolve('i++ done');
//             })
//             .catch((err) => {
//               reject(err);
//             });
//           })
//
//           );
//           });
//
//         });
//
//         return Promise.all(promiArray);
// }


//working async and waiting, however all firing at once causing issues for phantomJS
  // getChildLessons() {
  //
  //     return Promise.all([].concat(...this.lessons.levels.map((item, i) => {
  //
  //         return item.childlevels.map((childItem, iChild) => {
  //             return new Promise((resolve, reject) => {
  //             //return async process with Promise.resolve();
  //             console.log();
  //             console.log('getting url: ' + childItem.url);
  //
  //              this.horseman
  //             .open(childItem.url)
  //             .html()
  //             .then((html) => {
  //               cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
  //                 let lesson = cheerio(elem);
  //                 console.log('got url: ' + childItem.url);
  //                 console.log();
  //
  //                 this.lessons.levels[i].childlevels[iChild].lessons.push(
  //                   {name: lesson.text(), url: lesson.attr('href')}
  //                 );
  //               });
  //             })
  //             .then(() => {
  //               resolve('i++ done');
  //             })
  //             .catch((err) => {
  //               reject(err);
  //             });
  //           });
  //
  //           });
  //
  //         })
  //       ));
  // }

  // getChildLessons() {
  //
  //   const promi = Promise.resolve();
  //
  //   this.lessons.levels.map((item, i) => {
  //
  //               item.childlevels.map((childItem, iChild) => {
  //                   //return async process with Promise.resolve();
  //                   console.log();
  //                   console.log('getting url: ' + childItem.url);
  //                   promi.then(() => {
  //
  //                    this.horseman
  //                   .open(childItem.url)
  //                   .html()
  //                   .then((html) => {
  //                     cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
  //                       let lesson = cheerio(elem);
  //                       console.log('got url: ' + childItem.url);
  //                       console.log();
  //
  //                       this.lessons.levels[i].childlevels[iChild].lessons.push(
  //                         {name: lesson.text(), url: lesson.attr('href')}
  //                       );
  //                     });
  //                   });
  //                 });
  //                 });
  //
  //
  //               });
  //               return promi;
  //
  //
  //
  // }

  //WOKRING!!!!
  getChildLessons() {
    console.log('starting to get child lessons...');

    const asyncProcess = (childItem, iChild, i) => {
      return new Promise((resolve, reject) => {

        this.horseman
        .open(childItem.url)
        .html()
        .then((html) => {
          cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
            let lesson = cheerio(elem);

            this.lessons.levels[i].childlevels[iChild].lessons.push(
              {name: lesson.text(), url: lesson.attr('href')}
            );
          });
        })
        .then(() => {
          resolve('done');
        })
        .catch((err) => {
          reject(err);
        });
      });
    };

    const generatePromises = function* () {
      var i;
      var iLength = this.lessons.levels.length;
      for (i = 0; i < iLength; i++) {
        var iChild;
        var iChildLength = this.lessons.levels[i].childlevels.length;
        for (iChild = 0; iChild < iChildLength; iChild++) {
          yield asyncProcess(this.lessons.levels[i].childlevels[iChild], iChild, i);
        }
      }
    }.bind(this);
    const promiseIterator = generatePromises();
    const pool = new PromisePool(promiseIterator, 1);

    return pool.start().then(() => {console.log('done')});
  }
}

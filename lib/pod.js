import { cred } from './cred';
import { Files } from './files';
var Horseman = require("node-horseman");
var cheerio = require('cheerio');
var PromisePool = require('es6-promise-pool');
var readline = require('readline');

export class Pod {
  constructor(lessonsObj) {
    let options = { timeout: 30000 }
    let horseman = new Horseman(options);
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

  login() {
    return new Promise((resolve, reject) => {
      this.horseman
      .open(this.baseURL + 'member/login_new.php')
      .type('form[name="login"] input[name="amember_login"]', 'wmayger@outlook.com')
      .type('form[name="login"] input[name="amember_pass"]', cred.toString())
      .click('form[name="login"] input[name="remember_login"]')
      .click('form[name="login"] button[type="submit"]')
      .waitForNextPage()
      .text('.page-redirect__title.ill-sakai')
      .then((success) => {
        if (success.toString().toLowerCase().indexOf('successfully')) {
          resolve(true);
        }
        reject(false);
      });
    });
  }

  end() {
    this.horseman.close();
  }

  checkLogin() {
    return new Promise((resolve, reject) => {
      this.horseman
      .open(this.baseURL)
      .text('.dashbar-a__nav-item--sub.ill-ease-color')
      .then((loggedInElem) => {
        if (loggedInElem.toString().toLowerCase().indexOf('sign out')) {
          resolve(true);
        }
        reject(false);
      });
    });
  }

  write() {
    let files = new Files(this.horseman);
    console.log('writing files to "' + files.basePath + '" ...');
    files.WriteJsonObj(this.lessons);

    let counterLen = (() => {
      let totallength = 1;
      var i;
      var iLength = this.lessons.levels.length;
      for (i = 0; i < iLength; i++) {
        var iChild;
        var iChildLength = this.lessons.levels[i].childlevels.length;
        for (iChild = 0; iChild < iChildLength; iChild++) {
          var iLesson;
          var iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (iLesson = 0; iLesson < iLessonLength; iLesson++) {
            totallength += 1;
          }
        }
      }
      return totallength;
    })();

    var percentageDone = (() => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(' ');

      let itemIndex = 0;
      let itemsLength = counterLen;

      return () => {

        if (itemIndex === itemsLength - 2) {
          readline.clearLine(rl, 0);
          readline.cursorTo(rl, 0);
          rl.write('Percentage Completed: 100%');
          rl.close();
          console.log(' ');
          return true;
        }
        let oneP = itemIndex / itemsLength;
        let percentage = parseInt(oneP * 100);
        readline.clearLine(rl, 0);
        readline.cursorTo(rl, 0);
        rl.write('Percentage Completed: ' + percentage + '%');
        itemIndex += 1;
        return false;
      }
    })();

    const asyncProcess = (i, iChild, iLesson) => {
      return new Promise((resolve, reject) => {
        let parentFolder = this.lessons.levels[i].name.split(' ').join('_'),
            childFolder = this.lessons.levels[i].childlevels[iChild].name.split(' ').join('_'),
            lesson = this.lessons.levels[i].childlevels[iChild].lessons[iLesson],
            indiLessonFolder = lesson.name.split(' ').join('_'),
            fullLessonPath = parentFolder + '/' + childFolder + '/' + indiLessonFolder;

        files.WriteFolder(parentFolder)
        .then(() => {return files.WriteFolder(parentFolder + '/' + childFolder)})
        .then(() => {return files.WriteFolder(fullLessonPath)})
        .then(() => {return files.WriteFile(lesson.lessonnotes, fullLessonPath + '/notes.pdf')})
        .then(() => {return files.WriteFile(lesson.lessontranscript, fullLessonPath + '/transcript.pdf')})
        .then(() => {return files.WriteFile(lesson.lessonchecklist, fullLessonPath + '/checklist.pdf')})
        .then(() => {return files.WriteFile(lesson.lessonaudio, fullLessonPath + '/lesson.mp3')})
        .then(() => {return files.WriteFile(lesson.lessonreview, fullLessonPath + '/review.mp3')})
        .then(() => {return files.WriteFile(lesson.lessondialog, fullLessonPath + '/dialog.mp3')})
        .then(() => {
          resolve();
        })
        .catch((err) => {
          console.log(err);
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
          var iLesson;
          var iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (iLesson = 0; iLesson < iLessonLength; iLesson++) {
            percentageDone();
            yield asyncProcess(i, iChild, iLesson);
          }
        }
      }
    }.bind(this);
    const promiseIterator = generatePromises();
    const pool = new PromisePool(promiseIterator, 1);

    return pool.start().then(() => {console.log('done')});

  }

  getDownloadLinks() {
    console.log('getting downloadables...');

    let counterLen = (() => {
      let totallength = 1;
      var i;
      var iLength = this.lessons.levels.length;
      for (i = 0; i < iLength; i++) {
        var iChild;
        var iChildLength = this.lessons.levels[i].childlevels.length;
        for (iChild = 0; iChild < iChildLength; iChild++) {
          var iLesson;
          var iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (iLesson = 0; iLesson < iLessonLength; iLesson++) {
            totallength += 1;
          }
        }
      }
      return totallength;
    })();

    var percentageDone = (() => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(' ');

      let itemIndex = 0;
      let itemsLength = counterLen;

      return () => {

        if (itemIndex === itemsLength - 2) {
          readline.clearLine(rl, 0);
          readline.cursorTo(rl, 0);
          rl.write('Percentage Completed: 100%');
          rl.close();
          console.log(' ');
          return true;
        }
        let oneP = itemIndex / itemsLength;
        let percentage = parseInt(oneP * 100);
        readline.clearLine(rl, 0);
        readline.cursorTo(rl, 0);
        rl.write('Percentage Completed: ' + percentage + '%');
        itemIndex += 1;
        return false;
      }
    })();

    var addDownloadablesToObj = (html, iChild, i, iLesson) => {
      let lessonHtml = cheerio(html);
      let sortUrl = (url) => {
          if (url.charAt(0) === '/') return this.baseURL.slice(0,-1) + url;
          return url;
      };

      //docs
      let pdfs = lessonHtml.find('#pdfs ul li a');
      pdfs.map((index, elem) => {
        let pdfItem = cheerio(elem);
        switch (pdfItem.text().toLowerCase()) {
          case 'lesson notes':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessonnotes = sortUrl(pdfItem.attr('href'));
            break;
          case 'lesson transcript':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessontranscript = sortUrl(pdfItem.attr('href'));
            break;
          case 'lesson notes':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessonchecklist = sortUrl(dfItem.attr('href'));
            break;
          default:
            break;
        }
      });

      //audio
      let audios = lessonHtml.find('#download-center ul li a');
      audios.map((index, elem) => {
        let audioItem = cheerio(elem);
        switch (audioItem.text().toLowerCase()) {
          case 'lesson audio':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessonaudio = sortUrl(audioItem.attr('href'));
            break;
          case 'review':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessonreview = sortUrl(audioItem.attr('href'));
            break;
          case 'dialog':
            this.lessons.levels[i].childlevels[iChild].lessons[iLesson].lessondialog = sortUrl(audioItem.attr('href'));
            break;
          default:
            break;
        }
      });
    };

    const asyncProcess = (lesson, iChild, i, iLesson) => {
      return new Promise((resolve, reject) => {
        this.horseman
        .open(lesson.url)
        .html()
        .then((html) => {
            addDownloadablesToObj(html, iChild, i, iLesson);
        })
        .then(() => {
          resolve('done');
        })
        .catch((err) => {
          setTimeout(() => {
            this.horseman
            .open(lesson.url)
            .wait(10000)
            .html()
            .then((html) => {
              addDownloadablesToObj(html, iChild, i, iLesson);
            })
            .then(() => {
              resolve('done');
            }).catch((err) => {
              reject(err);
            });
          }, 10000);
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
          var iLesson;
          var iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (iLesson = 0; iLesson < iLessonLength; iLesson++) {
            percentageDone();
            yield asyncProcess(this.lessons.levels[i].childlevels[iChild].lessons[iLesson], iChild, i, iLesson);
          }
        }
      }
    }.bind(this);
    const promiseIterator = generatePromises();
    const pool = new PromisePool(promiseIterator, 1);

    return pool.start().then(() => {console.log('done')});

  }

    //WOKRING!!!!
    getChildLessons() {
      console.log('starting to get child lessons...');

      let counterLen = (() => {
        let totallength = 1;
        var i;
        var iLength = this.lessons.levels.length;
        for (i = 0; i < iLength; i++) {
          var iChild;
          var iChildLength = this.lessons.levels[i].childlevels.length;
          for (iChild = 0; iChild < iChildLength; iChild++) {
            totallength += 1;
          }
        }
        return totallength;
      })();

      var percentageDone = (() => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        console.log(' ');

        let itemIndex = 0;
        let itemsLength = counterLen;

        return () => {

          if (itemIndex === itemsLength - 2) {
            readline.clearLine(rl, 0);
            readline.cursorTo(rl, 0);
            rl.write('Percentage Completed: 100%');
            rl.close();
            console.log(' ');
            return true;
          }

          let oneP = itemIndex / itemsLength;
          let percentage = parseInt(oneP * 100);
          readline.clearLine(rl, 0);
          readline.cursorTo(rl, 0);
          rl.write('Percentage Completed: ' + percentage + '%');
          itemIndex += 1;
          return false;
        }
      })();

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
              setTimeout(() => {
              this.horseman
              .open(childItem.url)
              .wait(10000)
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
            }, 10000);
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
            percentageDone();
            yield asyncProcess(this.lessons.levels[i].childlevels[iChild], iChild, i);
          }
        }
      }.bind(this);
      const promiseIterator = generatePromises();
      const pool = new PromisePool(promiseIterator, 1);

      return pool.start().then(() => {console.log('done')});
    }

  getParentLessons() {
    return new Promise((resolve, reject) => {
      this.horseman
      .open(this.baseURL + 'index.php?cat=Introduction')
      .html()
      .then((html) => {
        cheerio(html).find('.ill-levels').map((i, elem) => {
          let levelObj = {},
              level = cheerio(elem).find('.ill-level-title'),
              levelName = level.text();
          if(levelName === 'News & Announcements') {
            return true;
          }

          levelObj = {name: levelName, url: 'https:' + level.attr('href'), childlevels: []};
          cheerio(elem).find('.ill-season-title').map((i, childelem) => {
            levelObj.childlevels.push({name: cheerio(childelem).text(), url: cheerio(childelem).attr('href'), lessons: []});
          });
          if (Object.keys(levelObj).length !== 0) {
            this.lessons.levels.push(levelObj);
          }

        });
        resolve(this.lessons.levels);
      });
    });
  }
}

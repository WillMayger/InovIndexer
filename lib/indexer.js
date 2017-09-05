//node_module imports
var Horseman = require("node-horseman");
var cheerio = require('cheerio');
var PromisePool = require('es6-promise-pool');
var readline = require('readline');

//other imports
import { cred } from './cred';
import { Files } from './files';

//class uses promises almost everywhere.
export class Indexer {
  constructor(thisOptions) {
    //node-horseman setup
    let options = { timeout: 30000 }
    let horseman = new Horseman(options);

    //files setup
    if (!thisOptions.resume) thisOptions.resume = false;
    let files = new Files(thisOptions.resume);

    //asigning values to Class via this
    this.files = files;
    this.horseman = horseman;

     //set the below to the base url of the site you will be "indexing"
     //PLEASE ENSURE THAT YOU INCLUDE THE TRAILING "/" AT THE END OF THE URL
    this.baseURL = 'https://www.frenchpod101.com/';

    //If object has been provided, use the file, else begin fresh lesson object.
    if (thisOptions.lessons !== undefined) {
      this.lessons = thisOptions.lessons;
    } else {
      this.lessons = {
        levels: []
      };
    }
  }

  //login method will be used to loginto the website.
  //must always be called first when using this class
  login() {
    return new Promise((resolve, reject) => {
      let success = false;

      //this will use the class's horseman to login then return whether it has been successful or not and set cookies if successful.
      this.horseman
      .open(this.baseURL + 'member/login_new.php')
      .type('form[name="login"] input[name="amember_login"]', 'wmayger@outlook.com')
      .type('form[name="login"] input[name="amember_pass"]', cred.toString())
      .click('form[name="login"] input[name="remember_login"]')
      .click('form[name="login"] button[type="submit"]')
      .waitForNextPage()
      .text('.page-redirect__title.ill-sakai')
      .then((success) => {
        success = success;
      })
      .cookies()
      .then((cookies) => {
        if (success.toString().toLowerCase().indexOf('successfully')) {
          return this.files.setCookies(cookies);
        }
        reject(false);
        return;
      })
      .then(() => {
        resolve(true);
      });
    });
  }

  //Must be called at the end when finished with all proceses to close node horseman.
  end() {
    conosle.log('Ending session...');
    this.horseman.close();
  }

  //Writes lessons obj to drive for re-use to save the time of indexing if needed
  writeJsonObj() {
    console.log('writing json file to "' + this.files.basePath + '/lessons.json" ...');
    this.files.WriteJsonObj(this.lessons);
  }

  //Used to write downloadables from the lessons object to drive.
  write() {
    //initiate
    console.log('writing files to "' + this.files.basePath + '" ...');

    // Self initiating function that returns the length for every lesson in lessons obj.
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

    //closure function to calculate the percentage completed for this stage of the process.
    var percentageDone = (() => {
      //init readlines interface
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      //create new line once (when closure has been initiated)
      console.log(' ');

      //set closure private variables
      let itemIndex = 0;
      let itemsLength = counterLen;

      //function that gets returned each time the parent function has been called
      return () => {
        //if this process has been completed run this and then return true
        if (itemIndex === itemsLength - 2) {
          readline.clearLine(rl, 0);
          readline.cursorTo(rl, 0);
          rl.write('Percentage Completed: 100%');
          rl.close();
          console.log(' ');
          return true;
        }

        //calculate percentage using variables.
        let oneP = itemIndex / itemsLength;
        let percentage = parseInt(oneP * 100);

        //write to console.
        readline.clearLine(rl, 0);
        readline.cursorTo(rl, 0);
        rl.write('Percentage Completed: ' + percentage + '%');

        //add to closure counter to show current index and then return false.
        itemIndex += 1;
        return false;
      }
    })();

    const removeForbiddenChars = (stringItem) => {
      return stringItem.split(' ').join('_')
        .split('<').join('__lessthan__')
        .split('>').join('__morethan__')
        .split(':').join('__colon__')
        .split('"').join('__quote__')
        .split('|').join('__pipe__')
        .split('?').join('__questionmark__')
        .split('/').join('__slash__')
        .split('\\').join('__backslash__')
        .split('.').join('__period__')
        .split('*').join('__asterisk__');
    };

    const asyncProcess = (i, iChild, iLesson) => {
      return new Promise((resolve, reject) => {
        let parentFolder = removeForbiddenChars(this.lessons.levels[i].name),
            childFolder = removeForbiddenChars(this.lessons.levels[i].childlevels[iChild].name),
            lesson = this.lessons.levels[i].childlevels[iChild].lessons[iLesson],
            indiLessonFolder = removeForbiddenChars(lesson.name),
            fullLessonPath = parentFolder + '/' + childFolder + '/' + indiLessonFolder;


        this.files.WriteFolder(parentFolder)
        .then(() => {return this.files.WriteFolder(parentFolder + '/' + childFolder)})
        .then(() => {return this.files.WriteFolder(fullLessonPath)})
        .then(() => {
          let subAsyncProcess = (it) => {
            return new Promise((resolve, reject) => {
                return this.files.WriteFile(lesson.downloads[it].url, fullLessonPath + '/' + lesson.downloads[it].name + '.' + lesson.downloads[it].fileType)
              .then(() => {
                resolve();
              })
              .catch((err) => {reject(err);})
            });
          }

          let subGeneratePromises = function* () {
            let it;
            var itLength = lesson.downloads.length;
            for (it = 0; it < itLength; it++) {
              yield subAsyncProcess(it);
            }
          }.bind(this);

          let subPromiseIterator = subGeneratePromises();
          let subPool = new PromisePool(subPromiseIterator, 1);
          return subPool.start();
        })
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

    const removeForbiddenChars = (stringItem) => {
      return stringItem.split(' ').join('_')
        .split('<').join('__lessthan__')
        .split('>').join('__morethan__')
        .split(':').join('__colon__')
        .split('"').join('__quote__')
        .split('|').join('__pipe__')
        .split('?').join('__questionmark__')
        .split('/').join('__slash__')
        .split('\\').join('__backslash__')
        .split('.').join('__period__')
        .split('*').join('__asterisk__');
    };

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
        this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads.push({
          url: sortUrl(pdfItem.attr('href')),
          name: removeForbiddenChars(pdfItem.text().toLowerCase()),
          fileType: 'pdf'
        });
      });

      //audio
      let audios = lessonHtml.find('#download-center ul li a');
      audios.map((index, elem) => {
        let audioItem = cheerio(elem);
        this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads.push({
          url: sortUrl(audioItem.attr('href')),
          name: removeForbiddenChars(audioItem.text().toLowerCase()),
          fileType: 'mp3'
        });
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

    return pool.start();

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
                  {name: lesson.text(), url: lesson.attr('href'), downloads: []}
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

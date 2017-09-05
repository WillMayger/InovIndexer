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
    if (!thisOptions) thisOptions = {lessons: undefined, resume: false};

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

      //this will use the class's horseman to login then return whether it has been successful or not and set cookies if successful.
      this.horseman
      .open(this.baseURL + 'member/login_new.php')
      .type('form[name="login"] input[name="amember_login"]', 'wmayger@outlook.com')
      .type('form[name="login"] input[name="amember_pass"]', cred.toString())
      .click('form[name="login"] input[name="remember_login"]')
      .click('form[name="login"] button[type="submit"]')
      .waitForNextPage()
      .text('.page-redirect__title.ill-sakai')
      .then((successRes) => {
        if (successRes.toString().toLowerCase().indexOf('successfully') === -1) {
          console.log('Not logged in...');
          reject(false);
          return;
        }
      })
      .cookies()
      .then((cookies) => {return this.files.setCookies(cookies)})
      .then(() => {
        console.log('logged in successfully');
        resolve(true);
      })
      .catch((err) => {reject(err)});
    });
  }

  //Must be called at the end when finished with all proceses to close node horseman.
  end() {
    console.log('Ending session...');
    this.horseman.close();
  }

  //Grouping all indexing methods together.
  startIndex() {
    return new Promise((resolve, reject) => {
      this.getParentLessons()
      .then(() => {return this.getChildLessons()})
      .then(() => {return this.getDownloadLinks()})
      .then(() => {resolve()})
      .catch((err) => {reject(err)});
    });
  }

  //Writes lessons obj to drive for re-use to save the time of indexing if needed
  writeJsonObj() {
    console.log('writing json file to "' + this.files.basePath + '/lessons.json" ...');
    this.files.WriteJsonObj(this.lessons);
  }

  //Used to write downloadables from the lessons object to drive.
  writeDownloadables() {
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

    const asyncProcess = (i, iChild, iLesson) => {
      return new Promise((resolve, reject) => {
        let parentFolder = this.removeForbiddenChars(this.lessons.levels[i].name),
        childFolder = this.removeForbiddenChars(this.lessons.levels[i].childlevels[iChild].name),
        lesson = this.lessons.levels[i].childlevels[iChild].lessons[iLesson],
        indiLessonFolder = this.removeForbiddenChars(lesson.name),
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
          name: this.removeForbiddenChars(pdfItem.text().toLowerCase()),
          fileType: 'pdf'
        });
      });

      //audio
      let audios = lessonHtml.find('#download-center ul li a');
      audios.map((index, elem) => {
        let audioItem = cheerio(elem);
        this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads.push({
          url: sortUrl(audioItem.attr('href')),
          name: this.removeForbiddenChars(audioItem.text().toLowerCase()),
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

  //Getting the second level to index
  getChildLessons() {
    console.log('starting to get child lessons...');
    //get total length of items and sub items combined for use in percentage calculation
    let counterLen = (() => {
      let totallength = 1;
      this.lessons.levels.forEach((loopItemOne, indexOne) => {
        loopItemOne.childlevels.forEach((loopItemTwo, indexTwo) => {
          totallength += 1;
        });
      });
      return totallength;
    })();
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator(counterLen);
    //when given valid html it will add relevant parts to index.
    let addToIndex = (html) => {
      cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
        let lesson = cheerio(elem);
        this.lessons.levels[i].childlevels[iChild].lessons.push({
          name: lesson.text(),
          url: lesson.attr('href'),
          downloads: []
        });
      });
    };
    //async process to get html for child lessons.
    let indexChildLessons = (childItem, iChild, i) => {
      return new Promise((resolve, reject) => {
        this.horseman
        .open(childItem.url)
        .html()
        .then((html) => {addToIndex(html)})
        .then(() => {resolve()})
        .catch((err) => {
          //this is for bad internet connections
          setTimeout(() => {
            this.horseman
            .open(childItem.url)
            .wait(10000)
            .html()
            .then((html) => {addToIndex(html)})
            .then(() => {resolve()})
            .catch((err) => {reject(err)});
          }, 10000);
        });
      });
    };
    //generator function to be passed into PromisePool
    let generatePromises = function* () {
      let iLength = this.lessons.levels.length;
      for (let i = 0; i < iLength; i++) {
        let iChildLength = this.lessons.levels[i].childlevels.length;
        for (let iChild = 0; iChild < iChildLength; iChild++) {
          //calling closure
          percentageCalc();
          //calling async process for indexing.
          yield indexChildLessons(this.lessons.levels[i].childlevels[iChild], iChild, i);
        }
      }
    }.bind(this); //this function requires this scope of this so it must be bound to it.
    let promiseIterator = generatePromises(),
        pool = new PromisePool(promiseIterator, 1);
    //start pool and resolve when all promises have been resolved
    return pool.start().then(() => {console.log('done')});
  }

  //Get the first level of lessons
  getParentLessons() {
    return new Promise((resolve, reject) => {
      //use this sessons headless browser to get html
      this.horseman
      .open(this.baseURL + 'index.php?cat=Introduction')
      .html()
      .then((html) => {
        cheerio(html).find('.ill-levels').map((i, elem) => {
          //assign variables
          let levelObj = {},
              level = cheerio(elem).find('.ill-level-title'),
              levelName = level.text();
          //this level needs skipping over!
          if(levelName === 'News & Announcements') {
            return true;
          }
          //add to level obj
          levelObj = {
            name: levelName,
            url: 'https:' + level.attr('href'),
              childlevels: []
          };
          //loop over each level item and then append them to childlevels within levelObj
          cheerio(elem).find('.ill-season-title').map((i, childelem) => {
            levelObj.childlevels.push({
              name: cheerio(childelem).text(),
              url: cheerio(childelem).attr('href'),
              lessons: []
            });
          });
          //if the object is not empty push to this.lessons.levels array
          if (Object.keys(levelObj).length !== 0) {
            this.lessons.levels.push(levelObj);
          }
        });
        resolve();
      })
      .catch((err) => {reject(err)});
    });
  }

  //closure for calculating percentage done.
  percentageCalculator (counterLen) {
    console.log(' ');

    let itemIndex = 0,
        itemsLength = counterLen,
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

    return () => {
      if (itemIndex === itemsLength - 2) {
        readline.clearLine(rl, 0);
        readline.cursorTo(rl, 0);
        rl.write('Percentage Completed: 100%');
        rl.close();
        console.log(' ');
        return true;
      }

      let oneP = itemIndex / itemsLength,
          percentage = parseInt(oneP * 100);

      readline.clearLine(rl, 0);
      readline.cursorTo(rl, 0);
      rl.write('Percentage Completed: ' + percentage + '%');
      itemIndex += 1;
      return false;
    }
  };

  //Mainly for windows users
  removeForbiddenChars(stringItem) {
    //check param
    if (stringItem === undefined) return undefined;
    let outputString = stringItem;
    //array of forbidden Chars and what to replace them with
    let forbiddenArray = [
      {char: ' ', replaceWith: '_'},
      {char: '<', replaceWith: '__lessthan__'},
      {char: '>', replaceWith: '__morethan__'},
      {char: ':', replaceWith: '__colon__'},
      {char: '"', replaceWith: '__quote__'},
      {char: '|', replaceWith: '__pipe__'},
      {char: '?', replaceWith: '__questionmark__'},
      {char: '/', replaceWith: '__slash__'},
      {char: '\\', replaceWith: '__backslash__'},
      {char: '.', replaceWith: '__period__'},
      {char: '*', replaceWith: '__asterisk__'}
    ]
    //loop over array and then replace any forbidden chars
    forbiddenArray.forEach((obj, index) => {
      outputString = outputString.split(obj.char).join(obj.replaceWith);
    });
    return outputString;
}

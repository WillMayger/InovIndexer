//node_module imports
const Horseman = require("node-horseman"),
      cheerio = require('cheerio'),
      PromisePool = require('es6-promise-pool'),
      readline = require('readline'),
      path = require('path');

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
    this.baseURL = '';

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
    console.log('writing json file to "' + this.files.basePath + 'lessons.json" ...');
    this.files.WriteJsonObj(this.lessons);
  }


  //Used to write downloadables from the lessons object to drive.
  writeDownloadables() {
    console.log('writing files to "' + this.files.basePath + '" ...');
    ///getting total length of object items
    let counterLen = this.calcPercentageLength(4);
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator(counterLen);
    //write folders and a file to path
    let downloadFileToPath = (i, iChild, iLesson, iDownloadable) => {
      return new Promise((resolve, reject) => {
        let parentFolder = this.removeForbiddenChars(this.lessons.levels[i].name),
            childFolder = this.removeForbiddenChars(this.lessons.levels[i].childlevels[iChild].name),
            lessonFolder = this.removeForbiddenChars(this.lessons.levels[i].childlevels[iChild].lessons[iLesson].name),
            downloadItem = this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads[iDownloadable],
            fullLessonPath = parentFolder + '/' + childFolder + '/' + lessonFolder;

        this.files.WriteFolder(parentFolder)
        .then(() => {return this.files.WriteFolder(parentFolder + '/' + childFolder)})
        .then(() => {return this.files.WriteFolder(fullLessonPath)})
        .then(() => {
          return this.files.WriteFile(
            downloadItem.url,
            fullLessonPath + '/' + this.removeForbiddenChars(downloadItem.name) + '.' + downloadItem.fileType
          );
        })
        .then(() => {resolve()})
        .catch((err) => {reject(err)});
      });
    };
    //generator function to iterate over all downloadables (Promises)
    let generatePromises = function* () {
      let iLength = this.lessons.levels.length;
      for (let i = 0; i < iLength; i++) {
        let iChildLength = this.lessons.levels[i].childlevels.length;
        for (let iChild = 0; iChild < iChildLength; iChild++) {
          let iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (let iLesson = 0; iLesson < iLessonLength; iLesson++) {
            let iDownloadableLength = this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads.length;
            for (let iDownloadable = 0; iDownloadable < iDownloadableLength; iDownloadable++) {
              //calling closure to calculate percentage done
              percentageCalc();
              //async process to run
              yield downloadFileToPath(i, iChild, iLesson, iDownloadable);
            }
          }
        }
      }
    }.bind(this);
    //pass generator function into PromisePool to iterate through
    let promiseIterator = generatePromises(),
        pool = new PromisePool(promiseIterator, 1);

    return pool.start();
  }


  //indexing download links
  getDownloadLinks() {
    console.log('getting downloadables...');
    //getting total length of object items
    let counterLen = this.calcPercentageLength(3);
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator(counterLen);
    //function that adds downloadables to lessons obj
    let addDownloadablesToObj = (html, iChild, i, iLesson) => {
      let sortUrl = (url) => {
        if (url.charAt(0) === '/') return this.baseURL.slice(0,-1) + url;
        return url;
      };
      let lessonHtml = cheerio(html),
          cssSelectors = [
            '#pdfs ul li a',
            '#download-center ul li a'
          ];
      //iterate over css selectors and append each download item into object.
      cssSelectors.forEach((cssSelector, cssSIndex) => {
        lessonHtml.find(cssSelector).map((index, elem) => {
          let downloadInfoItem = cheerio(elem);
          this.lessons.levels[i].childlevels[iChild].lessons[iLesson].downloads.push({
            url: sortUrl(downloadInfoItem.attr('href')),
            name: this.removeForbiddenChars(downloadInfoItem.text().toLowerCase()),
            fileType: path.extname(sortUrl(downloadInfoItem.attr('href'))).split('.').join('')
          });
        });
      });
    };
    //function that finds and indexes the downloadables
    let indexDownloadables = (lesson, iChild, i, iLesson) => {
      return new Promise((resolve, reject) => {
        this.horseman
        .open(lesson.url)
        .html()
        .then((html) => {addDownloadablesToObj(html, iChild, i, iLesson)})
        .then(() => {resolve()})
        .catch((err) => {
          setTimeout(() => {
            this.horseman
            .open(lesson.url)
            .wait(10000)
            .html()
            .then((html) => {addDownloadablesToObj(html, iChild, i, iLesson)})
            .then(() => {resolve()})
            .catch((err) => {reject(err)});
          }, 10000);
        });
      });
    };
    //generator function for promises
    let generatePromises = function* () {
      let iLength = this.lessons.levels.length;
      for (let i = 0; i < iLength; i++) {
        let iChildLength = this.lessons.levels[i].childlevels.length;
        for (let iChild = 0; iChild < iChildLength; iChild++) {
          let iLessonLength = this.lessons.levels[i].childlevels[iChild].lessons.length;
          for (let iLesson = 0; iLesson < iLessonLength; iLesson++) {
            //call closure for calculating the percentage done.
            percentageCalc();
            //async process
            yield indexDownloadables(this.lessons.levels[i].childlevels[iChild].lessons[iLesson], iChild, i, iLesson);
          }
        }
      }
    }.bind(this);
    //pass generator function into PromisePool to iterate through
    let promiseIterator = generatePromises(),
        pool = new PromisePool(promiseIterator, 1);

    return pool.start();
  }


  //Getting the second level to index
  getChildLessons() {
    console.log('starting to get child lessons...');
    //get total length of items and sub items combined for use in percentage calculation
    let counterLen = this.calcPercentageLength(2);
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator(counterLen);
    //when given valid html it will add relevant parts to index.
    let addToIndex = (html, i, iChild) => {
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
        .then((html) => {addToIndex(html, i, iChild)})
        .then(() => {resolve()})
        .catch((err) => {
          //this is for bad internet connections
          setTimeout(() => {
            this.horseman
            .open(childItem.url)
            .wait(10000)
            .html()
            .then((html) => {addToIndex(html, i, iChild)})
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
          //calling closure for calculation of percentage done
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
    console.log('starting to get parent lessons...');
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
          if(levelName === 'News & Announcements') return true;
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
          if (Object.keys(levelObj).length !== 0) this.lessons.levels.push(levelObj);
        });
        resolve();
      })
      .catch((err) => {reject(err)});
    });
  }

  //calculate length of object with the level of depth it is given to loop through
  calcPercentageLength(loopDepth) {
    let totallength = 1;
    this.lessons.levels.forEach((loopItemOne, indexOne) => {
      if (loopDepth <= 1) return totallength += 1;
      loopItemOne.childlevels.forEach((loopItemTwo, indexTwo) => {
        if (loopDepth <= 2) return totallength += 1;
        loopItemTwo.lessons.forEach((loopItemThree, indexThree) => {
          if (loopDepth <= 3) return totallength += 1;
          loopItemThree.downloads.forEach((loopItemFour, indexFour) => {
            if (loopDepth <= 4) return totallength += 1;
            return;
          });
        });
      });
    });
    return totallength;
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

}

//node_module imports
const Horseman = require("node-horseman"),
      cheerio = require('cheerio'),
      PromisePool = require('es6-promise-pool'),
      readline = require('readline'),
      path = require('path'),
      uuidv1 = require('uuid/v1'),
      uuidv5 = require('uuid/v5');

//other imports
import { cred } from './cred';
import { baseurl } from './urlbase';
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
    this.baseURL = baseurl.toString(); //just a string url

    //If object has been provided, use the file, else begin fresh lesson object.
    if (thisOptions.lessons !== undefined) {
      this.lessons = thisOptions.lessons;
    } else {
      this.lessons = {
        parents: {},
        children: {},
        lessons: {},
        downloads: {},
        keyArrays: {
          parents: [],
          children: [],
          lessons: [],
          downloads: []
        }
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
      .type('form[name="login"] input[name="amember_login"]', cred.email.toString())
      .type('form[name="login"] input[name="amember_pass"]', cred.pass.toString())
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
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator([this.lessons.keyArrays.parents, this.lessons.keyArrays.children, this.lessons.keyArrays.lessons, this.lessons.keyArrays.downloads], this);
    //write folders and a file to path
    let downloadFileToPath = (downloadItem) => {
      return new Promise((resolve, reject) => {
        let parentObj = this.lessons.parents[downloadableItem.parent_id],
            childObj = this.lessons.children[downloadableItem.child_id],
            lessonObj = this.lessons.lessons[downloadableItem.lesson_id],
            parentFolder = this.removeForbiddenChars(parentObj.name),
            childFolder = this.removeForbiddenChars(childObj.name),
            lessonFolder = this.removeForbiddenChars(lessonObj.name),
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
      let iDownloadableLength = this.lessons.keyArrays.downloads.length;
      for (let iDownloadable = 0; iDownloadable < iDownloadableLength; iDownloadable++) {
        let downloadID = this.lessons.keyArrays.downloads[iDownloadable];
        //calling closure to calculate percentage done
        percentageCalc();
        //async process to run
        yield downloadFileToPath(this.lessons.downloads[downloadID]);
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
    //new instance of percentage closure
    let percentageCalc = new this.percentageCalculator([this.lessons.keyArrays.parents, this.lessons.keyArrays.children, this.lessons.keyArrays.lessons], this);
    //function that adds downloadables to lessons obj
    let addDownloadablesToObj = (html, lesson) => {
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
          let downloadInfoItem = cheerio(elem),
              downloadName = this.removeForbiddenChars(downloadInfoItem.text().toLowerCase()),
              uuidTimeStampDownload = uuidv1(),
              uuidDownload = uuidv5(downloadName, uuidTimeStampDownload).toString();
          this.lessons.downloads[uuidDownload] = {
            url: sortUrl(downloadInfoItem.attr('href')),
            name: downloadName,
            fileType: path.extname(sortUrl(downloadInfoItem.attr('href'))).split('.').join(''),
            parent_id: lesson.parent_id,
            child_id: lesson.child_id,
            lesson_id: lesson.id,
            id: uuidDownload
          };
        });
      });
    };
    //function that finds and indexes the downloadables
    let indexDownloadables = (lesson) => {
      return new Promise((resolve, reject) => {
        this.horseman
        .open(lesson.url)
        .html()
        .then((html) => {addDownloadablesToObj(html, lesson)})
        .then(() => {resolve()})
        .catch((err) => {
          setTimeout(() => {
            this.horseman
            .open(lesson.url)
            .wait(10000)
            .html()
            .then((html) => {addDownloadablesToObj(html, lesson)})
            .then(() => {resolve()})
            .catch((err) => {reject(err)});
          }, 10000);
        });
      });
    };
    //generator function for promises
    let generatePromises = function* () {
      let iLessonLength = this.lessons.keyArrays.lessons.length;
      for (let iLesson = 0; iLesson < iLessonLength; iLesson++) {
          let lessonID = this.lessons.keyArrays.lessons[iLesson];
        //call closure for calculating the percentage done.
        percentageCalc();
        //async process
        yield indexDownloadables(this.lessons.lessons[lessonID]);
      }
    }.bind(this);
    //pass generator function into PromisePool to iterate through
    let promiseIterator = generatePromises(),
        pool = new PromisePool(promiseIterator, 1);

    return pool.start()
    .then(() => {
      createKeyArray(this.lessons.downloads, 'downloads');
    });
  }


  //Getting the second level to index
  getChildLessons() {
    console.log('starting to get child lessons...');

    //async process to get html for child lessons.
    let indexChildLessons = (childItem) => {
      return new Promise((resolve, reject) => {

        //when given valid html it will add relevant parts to index.
        let addToIndex = (html, childItem) => {
          cheerio(html).find('.ill-lessons-list .audio-lesson a.lesson-title').map((index, elem) => {
            let lesson = cheerio(elem),
                lessonName = lesson.text(),
                uuidTimeStampLesson = uuidv1(),
                uuidLesson = uuidv5(this.removeForbiddenChars(lessonName), uuidTimeStampLesson).toString();

            this.lessons.lessons[uuidLesson] = {
              name: lessonName,
              url: lesson.attr('href'),
              parent_id: childItem.parent_id,
              child_id: childItem.id,
              id: uuidLesson
            };
          });
        };

        this.horseman
        .open(childItem.url)
        .html()
        .then((html) => {addToIndex(html, childItem)})
        .then(() => {resolve()})
        .catch((err) => {
          //this is for bad internet connections
          setTimeout(() => {
            this.horseman
            .open(childItem.url)
            .wait(10000)
            .html()
            .then((html) => {addToIndex(html, childItem)})
            .then(() => {resolve()})
            .catch((err) => {reject(err)});
          }, 10000);
        });
      });
    };

    return processPromisePool(indexChildLessons, 'children', [this.lessons.keyArrays.parents, this.lessons.keyArrays.children], this);
  }

  processPromisePool(asyncProcess, thisLessonsType, percentageArray, self) {

    let percentageCalc = new self.percentageCalculator(percentageArray, self);

    let generatePromises = function* (self) {
      let lengthI = self.lessons.keyArrays[thisLessonsType].length;
      for (let i = 0; i < lengthI; i++) {
        let objID = self.lessons.keyArrays[thisLessonsType][i];
        //calling closure for calculation of percentage done
        percentageCalc();
        //calling async process for indexing.
        yield asyncProcess(self.lessons[thisLessonsType][objID]);
      }
    }; //this function requires this scope of this so it must be bound to it.

    let promiseIterator = generatePromises(),
        pool = new PromisePool(promiseIterator, 1);
    //start pool and resolve when all promises have been resolved
    return pool.start().then(() => {
      self.createKeyArray(self.lessons[thisLessonsType], thisLessonsType);
    });
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
          let parent = cheerio(elem).find('.ill-level-title'),
              parentName = parent.text();
          //this level needs skipping over!
          if(parentName === 'News & Announcements') return true;
          //generate uuid
          let uuidTimeStampParent = uuidv1(),
              uuidParent = uuidv5(this.removeForbiddenChars(parentName), uuidTimeStampParent).toString();
          //add to parent array
          this.lessons.parents[uuidParent] = {
            name: parentName,
            url: 'https:' + parent.attr('href'),
            id: uuidParent
          };
          //loop over each level item and add them to the this.lessons obj
          cheerio(elem).find('.ill-season-title').map((i, childelem) => {
            if (childelem && childelem !== 0) {
              let childName = cheerio(childelem).text(),
                  uuidTimeStampChild = uuidv1(),
                  uuidChild = uuidv5(this.removeForbiddenChars(childName), uuidTimeStampChild).toString();

              this.lessons.children[uuidChild] = {
                name: cheerio(childelem).text(),
                url: cheerio(childelem).attr('href'),
                parent_id: uuidParent,
                id: uuidChild
              };
            }
          });
        });
      })
      .then(() => {
        createKeyArray(this.lessons.parents, 'parents');
        createKeyArray(this.lessons.children, 'children');
        resolve();
      })
      .catch((err) => {reject(err)});
    });
  }

  //closure for calculating percentage done.
  percentageCalculator(arrayOfObjects, self) {
    console.log(' ');

    let itemIndex = 0,
        itemsLength = self.calcPercentageLength(arrayOfObjects),
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

  createKeyArray(obj, type) {
    this.lessons.keyArrays[type] = Object.keys(obj);
  }

  //calculate length of object with the level of depth it is given to loop through
  calcPercentageLength(arrayOfArrays) {
    if (!arrayOfArrays) return 0;

    let totallength = 0;
    arrayOfObjects.forEach((array, index) => {
      totallength += parseInt(array.length);
    });
    return totallength;
  }

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
